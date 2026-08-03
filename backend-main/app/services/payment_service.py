import hashlib
import json
import uuid
from calendar import monthrange
from datetime import datetime, timezone

from flask import current_app
from sqlalchemy.exc import IntegrityError

from app.clients.toss_payments_client import TossPaymentsClient, TossPaymentsError
from app.extensions import db
from app.repositories import (
    BillingProductRepository,
    MemberBillingProfileRepository,
    PaymentTransactionRepository,
    PaymentWebhookRepository,
    SubscriptionRepository,
)
from app.schemas.payment_schema import (
    billing_profile_to_dict,
    billing_product_to_dict,
    payment_transaction_to_dict,
)
from app.schemas.subscription_schema import member_subscription_to_dict
from app.utils.crypto import decrypt_text, encrypt_text


class PaymentDisabledError(RuntimeError):
    pass


class PaymentConfigurationError(RuntimeError):
    pass


class PaymentVerificationError(RuntimeError):
    """제공자 응답이 서버에 저장된 결제 계약과 일치하지 않을 때 발생한다."""

    pass


class PaymentService:
    """결제·구독 상태 전이를 조율하는 애플리케이션 서비스.

    클라이언트가 보낸 금액이나 웹훅 payload를 최종 사실로 신뢰하지 않는다.
    상품 가격은 DB에서 읽고, 웹훅 상태는 Toss 결제 조회 응답으로 재검증한다.
    """

    PROVIDER = "TOSS"

    @staticmethod
    def _ensure_enabled():
        if not current_app.config.get("PAYMENT_ENABLED", False):
            raise PaymentDisabledError("Payment feature is disabled")
        provider = str(current_app.config.get("PAYMENT_PROVIDER", "TOSS")).upper()
        if provider != PaymentService.PROVIDER:
            raise PaymentConfigurationError("Unsupported payment provider")

    @staticmethod
    def _client():
        secret = current_app.config.get("TOSS_SECRET_KEY")
        if not secret:
            raise PaymentConfigurationError("Toss Payments is not configured")
        timeout = current_app.config.get("TOSS_API_TIMEOUT_SECONDS", 70)
        return TossPaymentsClient(secret, timeout=timeout)

    @staticmethod
    def get_plus_product():
        product = BillingProductRepository.get_active_plus_product(PaymentService.PROVIDER)
        if not product:
            raise PaymentConfigurationError("Active Plus billing product is not configured")
        return product

    @staticmethod
    def prepare_billing_auth(member_id):
        PaymentService._ensure_enabled()
        product = PaymentService.get_plus_product()
        client_key = current_app.config.get("TOSS_CLIENT_KEY")
        if not client_key:
            raise PaymentConfigurationError("Toss client key is not configured")
        profile = MemberBillingProfileRepository.get_by_member_provider(member_id, PaymentService.PROVIDER)
        customer_key = getattr(profile, "customer_key", None) or f"filtory_{member_id}_{uuid.uuid4().hex}"
        try:
            if profile:
                update = {"customer_key": customer_key}
                if profile.status != "active":
                    update["status"] = "pending"
                MemberBillingProfileRepository.update(profile, update)
            else:
                profile = MemberBillingProfileRepository.create({
                    "member_id": member_id,
                    "provider": PaymentService.PROVIDER,
                    "customer_key": customer_key,
                    "status": "pending",
                })
            db.session.commit()
        except Exception:
            db.session.rollback()
            raise
        return {
            "clientKey": client_key,
            "customerKey": customer_key,
            "product": billing_product_to_dict(product),
            "successUrl": current_app.config["PAYMENT_SUCCESS_URL"],
            "failUrl": current_app.config["PAYMENT_FAIL_URL"],
        }

    @staticmethod
    def confirm_billing_auth(member_id, auth_key, customer_key):
        PaymentService._ensure_enabled()
        if not auth_key or not customer_key:
            raise ValueError("authKey and customerKey are required")
        profile = MemberBillingProfileRepository.get_by_customer_key(PaymentService.PROVIDER, customer_key)
        if not profile or profile.member_id != member_id:
            raise PermissionError("Billing profile permission is required")
        response = PaymentService._client().issue_billing_key(auth_key, customer_key)
        billing_key = response.get("billingKey")
        if not billing_key:
            raise TossPaymentsError("Toss billing key was not returned")
        now = datetime.now(timezone.utc)
        card = response.get("card") if isinstance(response.get("card"), dict) else {}
        try:
            MemberBillingProfileRepository.update(profile, {
                "encrypted_billing_key": encrypt_text(billing_key),
                "encryption_key_version": current_app.config.get("BILLING_KEY_ENCRYPTION_VERSION", "v1"),
                "status": "active",
                "card_company": card.get("issuerCode") or card.get("company"),
                "card_number_masked": PaymentService._masked_card_number(card.get("number")),
                "authenticated_at": now,
                "last_verified_at": now,
                "revoked_at": None,
            })
            db.session.commit()
        except Exception:
            db.session.rollback()
            raise
        return billing_profile_to_dict(profile)

    @staticmethod
    def charge_initial_subscription(member_id):
        """최초 Plus 결제를 멱등하게 승인하고 검증된 경우에만 구독을 생성한다.

        READY/IN_PROGRESS partial unique index가 동시 요청의 최종 중재자다. 네트워크
        응답이 유실된 경우에는 거래를 실패로 닫지 않아 동일 주문으로 재시도한다.
        """
        PaymentService._ensure_enabled()
        product = PaymentService.get_plus_product()
        if SubscriptionRepository.get_current_paid_subscription(member_id):
            raise ValueError("An active subscription already exists")
        profile = MemberBillingProfileRepository.get_by_member_provider(member_id, PaymentService.PROVIDER)
        if not profile or profile.status != "active" or not profile.encrypted_billing_key:
            raise ValueError("Active billing profile is required")
        billing_key = decrypt_text(profile.encrypted_billing_key)
        transaction = PaymentTransactionRepository.get_resumable_initial(member_id, product.id)
        if not transaction:
            idempotency_key = uuid.uuid4()
            order_id = f"filtory-plus-{member_id}-{uuid.uuid4().hex}"
            transaction = PaymentTransactionRepository.create({
                "member_id": member_id,
                "billing_product_id": product.id,
                "billing_profile_id": profile.id,
                "provider": PaymentService.PROVIDER,
                "transaction_type": "INITIAL",
                "order_id": order_id,
                "idempotency_key": idempotency_key,
                "amount": product.amount,
                "currency": product.currency,
                "status": "READY",
            })
            try:
                # Flush makes the partial unique index arbitrate concurrent requests.
                db.session.flush()
            except IntegrityError:
                # 다른 요청이 먼저 진행 거래를 만들었다. 새 주문을 사용하지 않고
                # 승리한 거래의 order_id/idempotency_key를 이어서 사용한다.
                db.session.rollback()
                transaction = PaymentTransactionRepository.get_resumable_initial(member_id, product.id)
                if not transaction:
                    raise

        idempotency_key = transaction.idempotency_key
        order_id = transaction.order_id
        if transaction.status == "VERIFICATION_REQUIRED":
            return PaymentService._reconcile_initial_transaction(transaction, product, profile)
        # A competing request may have completed while this request waited on
        # the partial unique index. Re-check before any provider call.
        if SubscriptionRepository.get_current_paid_subscription(member_id):
            PaymentTransactionRepository.update(transaction, {
                "status": "FAILED",
                "failure_code": "SUBSCRIPTION_ALREADY_ACTIVE",
                "failure_message": "An active subscription already exists",
            })
            db.session.commit()
            raise ValueError("An active subscription already exists")
        try:
            PaymentTransactionRepository.update(transaction, {"status": "IN_PROGRESS"})
            db.session.commit()
            response = PaymentService._client().charge_billing_key(
                billing_key,
                customer_key=profile.customer_key,
                amount=product.amount,
                order_id=order_id,
                order_name=product.plan.plan_name,
                idempotency_key=idempotency_key,
            )
        except TossPaymentsError as exc:
            if exc.outcome_uncertain:
                # Toss가 결제를 처리했으나 응답만 유실됐을 수 있으므로 FAILED로
                # 확정하면 안 된다. 같은 멱등 키 재호출이 중복 과금을 막는다.
                PaymentTransactionRepository.update(transaction, {
                    "status": "IN_PROGRESS",
                    "failure_code": "PROVIDER_OUTCOME_UNKNOWN",
                    "failure_message": "Payment result verification is pending",
                })
            else:
                PaymentTransactionRepository.update(transaction, {
                    "status": "FAILED",
                    "failure_code": exc.code or "PROVIDER_REJECTED",
                    "failure_message": "Payment approval failed",
                })
            db.session.commit()
            raise
        try:
            # 구독 entitlement는 결제 객체의 핵심 필드가 서버 계약과 모두 일치한
            # 뒤에만 부여한다. 검증보다 구독 생성을 먼저 옮기지 않는다.
            PaymentService._validate_payment_response(response, transaction, product)
        except PaymentVerificationError:
            PaymentTransactionRepository.update(transaction, {
                "status": "VERIFICATION_REQUIRED",
                "payment_key": response.get("paymentKey") or transaction.payment_key,
                "failure_code": "INVALID_PROVIDER_RESPONSE",
                "failure_message": "Payment approval response verification failed",
                "raw_response_json": PaymentService._safe_provider_payload(response),
            })
            db.session.commit()
            raise
        return PaymentService._complete_initial_transaction(transaction, product, profile, response)

    @staticmethod
    def _reconcile_initial_transaction(transaction, product, profile):
        client = PaymentService._client()
        try:
            if transaction.payment_key:
                response = client.get_payment(transaction.payment_key)
            else:
                response = client.get_payment_by_order_id(transaction.order_id)
        except TossPaymentsError as exc:
            update = {
                "status": "VERIFICATION_REQUIRED",
                "failure_code": exc.code or "RECONCILIATION_PENDING",
                "failure_message": "Payment verification is pending",
            }
            if exc.status == 404 or exc.code == "NOT_FOUND_PAYMENT":
                update.update({
                    "status": "FAILED",
                    "failure_message": "Payment was not approved",
                })
            PaymentTransactionRepository.update(transaction, update)
            db.session.commit()
            raise

        provider_status = str(response.get("status") or "").upper()
        try:
            PaymentService._validate_payment_response(
                response,
                transaction,
                product,
                allowed_statuses={provider_status},
            )
        except PaymentVerificationError:
            PaymentTransactionRepository.update(transaction, {
                "status": "VERIFICATION_REQUIRED",
                "payment_key": response.get("paymentKey") or transaction.payment_key,
                "failure_code": "INVALID_PROVIDER_RESPONSE",
                "failure_message": "Payment reconciliation verification failed",
                "raw_response_json": PaymentService._safe_provider_payload(response),
            })
            db.session.commit()
            raise

        if provider_status == "DONE":
            return PaymentService._complete_initial_transaction(transaction, product, profile, response)

        if provider_status in {"FAILED", "CANCELED", "PARTIAL_CANCELED", "ABORTED", "EXPIRED"}:
            PaymentTransactionRepository.update(transaction, {
                "status": "FAILED",
                "payment_key": response.get("paymentKey") or transaction.payment_key,
                "failure_code": f"PROVIDER_{provider_status}",
                "failure_message": "Payment was not approved",
                "raw_response_json": PaymentService._safe_provider_payload(response),
            })
            db.session.commit()
            raise PaymentVerificationError("Payment was not approved")

        PaymentTransactionRepository.update(transaction, {
            "status": "VERIFICATION_REQUIRED",
            "payment_key": response.get("paymentKey") or transaction.payment_key,
            "failure_code": "RECONCILIATION_PENDING",
            "failure_message": "Payment verification is pending",
            "raw_response_json": PaymentService._safe_provider_payload(response),
        })
        db.session.commit()
        raise PaymentVerificationError("Payment verification is pending")

    @staticmethod
    def _complete_initial_transaction(transaction, product, profile, response):
        now = datetime.now(timezone.utc)
        subscription = getattr(transaction, "subscription", None)
        if not subscription:
            subscription = SubscriptionRepository.create_member_subscription({
                "member_id": transaction.member_id,
                "plan_id": product.plan_id,
                "status": "active",
                "started_at": now,
                "current_period_start": now,
                "current_period_end": PaymentService._add_one_month(now),
                "cancel_at_period_end": False,
                "payment_provider": PaymentService.PROVIDER,
                "payment_customer_id": profile.customer_key,
                "payment_subscription_id": response.get("paymentKey"),
                "provider_product_id": product.provider_product_id,
                "provider_purchase_id": response.get("paymentKey"),
                "last_verified_at": now,
                "auto_renew": True,
            })
        try:
            db.session.flush()
            PaymentTransactionRepository.update(transaction, {
                "subscription_id": subscription.id,
                "payment_key": response.get("paymentKey"),
                "status": "DONE",
                "approved_at": now,
                "failure_code": None,
                "failure_message": None,
                "raw_response_json": PaymentService._safe_provider_payload(response),
            })
            db.session.commit()
        except Exception:
            db.session.rollback()
            raise
        return {
            "subscription": member_subscription_to_dict(subscription),
            "payment": payment_transaction_to_dict(transaction),
        }

    @staticmethod
    def get_my_payments(member_id):
        subscription = SubscriptionRepository.get_current_paid_subscription(member_id)
        profile = MemberBillingProfileRepository.get_by_member_provider(member_id, PaymentService.PROVIDER)
        transactions = PaymentTransactionRepository.list_by_member(member_id)
        billing_profile = billing_profile_to_dict(profile) if profile else None
        if billing_profile:
            billing_profile.pop("customerKey", None)
        public_transactions = []
        for transaction in transactions:
            item = payment_transaction_to_dict(transaction)
            item.pop("paymentKey", None)
            public_transactions.append(item)
        return {
            "paymentEnabled": bool(current_app.config.get("PAYMENT_ENABLED", False)),
            "subscription": member_subscription_to_dict(subscription) if subscription else None,
            "billingProfile": billing_profile,
            "transactions": public_transactions,
        }

    @staticmethod
    def cancel_subscription(member_id):
        PaymentService._ensure_enabled()
        subscription = SubscriptionRepository.get_current_paid_subscription(member_id)
        if not subscription:
            raise ValueError("Active subscription not found")
        now = datetime.now(timezone.utc)
        SubscriptionRepository.update_member_subscription(subscription, {
            "status": "cancel_scheduled",
            "cancel_at_period_end": True,
            "canceled_at": now,
            "auto_renew": False,
        })
        db.session.commit()
        return member_subscription_to_dict(subscription)

    @staticmethod
    def process_webhook(payload, headers):
        """Toss 웹훅을 재처리 가능하게 기록하고 조회 API 결과만 DB에 반영한다.

        RECEIVED/FAILED 이벤트는 서버 종료나 일시 장애 후 다시 처리할 수 있다.
        PROCESSED/IGNORED만 종결 상태이며, row lock으로 동시 재전송을 직렬화한다.
        """
        PaymentService._ensure_enabled()
        event_type = str(payload.get("eventType") or payload.get("type") or "UNKNOWN")[:100]
        payment_key = payload.get("paymentKey") or (payload.get("data") or {}).get("paymentKey")
        supplied_key = headers.get("tosspayments-webhook-transmission-id")
        canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
        deduplication_key = str(supplied_key or hashlib.sha256(canonical.encode("utf-8")).hexdigest())[:255]
        event = PaymentWebhookRepository.get_by_deduplication_key(
            PaymentService.PROVIDER, deduplication_key, for_update=True
        )
        if event and event.processing_status in {"PROCESSED", "IGNORED"}:
            db.session.rollback()
            return {"duplicate": True, "status": event.processing_status}
        if not event:
            event = PaymentWebhookRepository.create({
                "provider": PaymentService.PROVIDER,
                "event_type": event_type,
                "deduplication_key": deduplication_key,
                "payment_key": payment_key,
                "processing_status": "RECEIVED",
                "payload_json": PaymentService._safe_provider_payload(payload),
            })
            try:
                # dedup unique constraint가 동시에 도착한 동일 이벤트를 중재한다.
                db.session.flush()
            except IntegrityError:
                db.session.rollback()
                event = PaymentWebhookRepository.get_by_deduplication_key(
                    PaymentService.PROVIDER, deduplication_key, for_update=True
                )
                if not event:
                    raise
                if event.processing_status in {"PROCESSED", "IGNORED"}:
                    db.session.rollback()
                    return {"duplicate": True, "status": event.processing_status}
        PaymentWebhookRepository.update(event, {
            "processing_status": "RECEIVED",
            "processed_at": None,
            "error_message": None,
            "payment_key": payment_key,
        })
        if not payment_key:
            PaymentWebhookRepository.update(event, {
                "processing_status": "IGNORED",
                "processed_at": datetime.now(timezone.utc),
                "error_message": "Payment key is required",
            })
            db.session.commit()
            return {"duplicate": False, "status": "IGNORED"}
        try:
            # The webhook body is only a notification. Provider query is the
            # source of truth for all payment/subscription state changes.
            transaction = PaymentTransactionRepository.get_by_payment_key(PaymentService.PROVIDER, payment_key)
            if not transaction:
                PaymentWebhookRepository.update(event, {
                    "processing_status": "IGNORED", "processed_at": datetime.now(timezone.utc)
                })
                db.session.commit()
                return {"duplicate": False, "status": "IGNORED"}

            provider_payment = PaymentService._client().get_payment(payment_key)
            PaymentService._validate_payment_response(
                provider_payment,
                transaction,
                transaction.billing_product,
                allowed_statuses={"DONE", "CANCELED", "PARTIAL_CANCELED"},
            )
            now = datetime.now(timezone.utc)
            provider_status = str(provider_payment.get("status") or "").upper()
            update = {
                "status": provider_status,
                "raw_response_json": PaymentService._safe_provider_payload(provider_payment),
            }
            if provider_status in {"CANCELED", "PARTIAL_CANCELED"}:
                update["canceled_at"] = now
            PaymentTransactionRepository.update(transaction, update)

            subscription = transaction.subscription
            if subscription:
                if provider_status == "DONE":
                    SubscriptionRepository.update_member_subscription(subscription, {"last_verified_at": now})
                elif provider_status == "CANCELED" or int(provider_payment.get("balanceAmount") or 0) == 0:
                    # 전액 취소는 즉시 entitlement에서 제외되는 종결 상태로 만든다.
                    SubscriptionRepository.update_member_subscription(subscription, {
                        "status": "refunded",
                        "auto_renew": False,
                        "cancel_at_period_end": False,
                        "canceled_at": now,
                        "ended_at": now,
                        "last_verified_at": now,
                    })
                else:
                    SubscriptionRepository.update_member_subscription(subscription, {"last_verified_at": now})
            PaymentWebhookRepository.update(event, {
                "processing_status": "PROCESSED", "processed_at": now
            })
            db.session.commit()
            return {"duplicate": False, "status": "PROCESSED"}
        except PaymentVerificationError:
            db.session.rollback()
            transaction = PaymentTransactionRepository.get_by_payment_key(PaymentService.PROVIDER, payment_key)
            if transaction:
                PaymentTransactionRepository.update(transaction, {
                    "failure_code": "WEBHOOK_VERIFICATION_FAILED",
                    "failure_message": "Payment status verification failed",
                })
                if transaction.subscription:
                    SubscriptionRepository.update_member_subscription(transaction.subscription, {
                        "status": "verification_required", "auto_renew": False
                    })
            failed_event = PaymentWebhookRepository.get_by_deduplication_key(
                PaymentService.PROVIDER, deduplication_key, for_update=True
            )
            if failed_event:
                PaymentWebhookRepository.update(failed_event, {
                    "processing_status": "FAILED",
                    "processed_at": datetime.now(timezone.utc),
                    "error_message": "Payment verification failed",
                })
            db.session.commit()
            raise
        except Exception as exc:
            db.session.rollback()
            failed_event = PaymentWebhookRepository.get_by_deduplication_key(
                PaymentService.PROVIDER, deduplication_key, for_update=True
            )
            if failed_event:
                PaymentWebhookRepository.update(failed_event, {
                    "processing_status": "FAILED",
                    "processed_at": datetime.now(timezone.utc),
                    "error_message": exc.__class__.__name__,
                })
                db.session.commit()
            raise

    @staticmethod
    def _validate_payment_response(response, transaction, product, *, allowed_statuses=None):
        """결제 응답을 DB 주문·상품과 대조해 변조 및 잘못된 연결을 차단한다."""
        allowed_statuses = allowed_statuses or {"DONE"}
        if not isinstance(response, dict):
            raise PaymentVerificationError("Invalid payment provider response")
        try:
            amount_matches = int(response.get("totalAmount")) == int(product.amount)
        except (TypeError, ValueError):
            amount_matches = False
        provider_status = str(response.get("status") or "").upper()
        checks = (
            bool(provider_status) and provider_status in allowed_statuses,
            bool(response.get("paymentKey")),
            response.get("paymentKey") == (transaction.payment_key or response.get("paymentKey")),
            response.get("orderId") == transaction.order_id,
            amount_matches,
            str(response.get("currency") or "").upper() == str(product.currency or "").upper(),
        )
        if not all(checks):
            raise PaymentVerificationError("Payment provider response verification failed")

    @staticmethod
    def _add_one_month(value):
        month = 1 if value.month == 12 else value.month + 1
        year = value.year + 1 if value.month == 12 else value.year
        return value.replace(year=year, month=month, day=min(value.day, monthrange(year, month)[1]))

    @staticmethod
    def _masked_card_number(value):
        text = "".join(character for character in str(value or "") if character.isdigit() or character == "*")
        if not text:
            return None
        if "*" in text:
            return text[-24:]
        digits = "".join(character for character in text if character.isdigit())
        return f"****-****-****-{digits[-4:]}" if digits else None

    @staticmethod
    def _safe_provider_payload(payload):
        """운영 진단에 필요한 필드만 남기고 결제 비밀정보 저장을 차단한다."""
        blocked = {"billingkey", "authkey", "cardnumber", "number", "secret", "cvc"}
        if isinstance(payload, dict):
            return {
                str(key): PaymentService._safe_provider_payload(value)
                for key, value in payload.items()
                if str(key).lower() not in blocked
            }
        if isinstance(payload, list):
            return [PaymentService._safe_provider_payload(value) for value in payload[:100]]
        return payload
