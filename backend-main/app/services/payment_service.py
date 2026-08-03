import hashlib
import json
import uuid
from calendar import monthrange
from datetime import datetime, timezone

from flask import current_app

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


class PaymentService:
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
        return TossPaymentsClient(secret)

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
        PaymentService._ensure_enabled()
        product = PaymentService.get_plus_product()
        if SubscriptionRepository.get_current_paid_subscription(member_id):
            raise ValueError("An active subscription already exists")
        profile = MemberBillingProfileRepository.get_by_member_provider(member_id, PaymentService.PROVIDER)
        if not profile or profile.status != "active" or not profile.encrypted_billing_key:
            raise ValueError("Active billing profile is required")
        billing_key = decrypt_text(profile.encrypted_billing_key)
        transaction = PaymentTransactionRepository.get_resumable_initial(member_id, product.id)
        if transaction:
            idempotency_key = transaction.idempotency_key
            order_id = transaction.order_id
        else:
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
            PaymentTransactionRepository.update(transaction, {
                "status": "FAILED", "failure_code": exc.code, "failure_message": "Payment approval failed"
            })
            db.session.commit()
            raise
        now = datetime.now(timezone.utc)
        subscription = SubscriptionRepository.create_member_subscription({
            "member_id": member_id,
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
        return {
            "paymentEnabled": bool(current_app.config.get("PAYMENT_ENABLED", False)),
            "subscription": member_subscription_to_dict(subscription) if subscription else None,
            "billingProfile": billing_profile_to_dict(profile) if profile else None,
            "transactions": [payment_transaction_to_dict(item) for item in transactions],
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
        PaymentService._ensure_enabled()
        event_type = str(payload.get("eventType") or payload.get("type") or "UNKNOWN")[:100]
        payment_key = payload.get("paymentKey") or (payload.get("data") or {}).get("paymentKey")
        supplied_key = headers.get("X-Toss-Event-Id")
        canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
        deduplication_key = str(supplied_key or hashlib.sha256(canonical.encode("utf-8")).hexdigest())[:255]
        existing = PaymentWebhookRepository.get_by_deduplication_key(PaymentService.PROVIDER, deduplication_key)
        if existing:
            return {"duplicate": True, "status": existing.processing_status}
        event = PaymentWebhookRepository.create({
            "provider": PaymentService.PROVIDER,
            "event_type": event_type,
            "deduplication_key": deduplication_key,
            "payment_key": payment_key,
            "processing_status": "RECEIVED",
            "payload_json": PaymentService._safe_provider_payload(payload),
        })
        db.session.commit()
        try:
            transaction = PaymentTransactionRepository.get_by_payment_key(PaymentService.PROVIDER, payment_key)
            now = datetime.now(timezone.utc)
            if not transaction:
                PaymentWebhookRepository.update(event, {"processing_status": "IGNORED", "processed_at": now})
            else:
                provider_status = str(payload.get("status") or (payload.get("data") or {}).get("status") or "").upper()
                mapped = provider_status if provider_status in {
                    "DONE", "FAILED", "CANCELED", "PARTIAL_CANCELED", "ABORTED", "EXPIRED"
                } else transaction.status
                PaymentTransactionRepository.update(transaction, {
                    "status": mapped,
                    "canceled_at": now if mapped in {"CANCELED", "PARTIAL_CANCELED"} else transaction.canceled_at,
                })
                PaymentWebhookRepository.update(event, {"processing_status": "PROCESSED", "processed_at": now})
            db.session.commit()
            return {"duplicate": False, "status": event.processing_status}
        except Exception as exc:
            db.session.rollback()
            failed_event = PaymentWebhookRepository.get_by_deduplication_key(PaymentService.PROVIDER, deduplication_key)
            if failed_event:
                PaymentWebhookRepository.update(failed_event, {
                    "processing_status": "FAILED",
                    "processed_at": datetime.now(timezone.utc),
                    "error_message": exc.__class__.__name__,
                })
                db.session.commit()
            raise

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
