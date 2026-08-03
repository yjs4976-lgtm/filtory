from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
import uuid

import pytest
from flask import Flask
from cryptography.fernet import Fernet
from sqlalchemy.exc import IntegrityError

import app.services.payment_service as payment_service_module
from app.repositories import (
    MemberBillingProfileRepository,
    PaymentTransactionRepository,
    PaymentWebhookRepository,
    SubscriptionRepository,
)
from app.clients.toss_payments_client import TossPaymentsError
from app.models import PaymentTransaction
from app.services.payment_service import PaymentDisabledError, PaymentService, PaymentVerificationError
from app.utils.crypto import BillingKeyEncryptionError, decrypt_text, encrypt_text


@pytest.fixture
def app():
    app = Flask(__name__)
    app.config.update(
        PAYMENT_ENABLED=True,
        PAYMENT_RENEWAL_ENABLED=True,
        PAYMENT_PROVIDER="TOSS",
        TOSS_CLIENT_KEY="test_client_key",
        TOSS_SECRET_KEY="test_secret_key",
        TOSS_API_TIMEOUT_SECONDS=70,
        PAYMENT_SUCCESS_URL="http://localhost/payments/success",
        PAYMENT_FAIL_URL="http://localhost/payments/fail",
        BILLING_KEY_ENCRYPTION_KEY=None,
    )
    return app


def test_billing_encryption_key_is_required(app):
    with app.app_context(), pytest.raises(BillingKeyEncryptionError):
        encrypt_text("billing-key")


def test_new_purchase_is_disabled_until_renewal_capability_is_enabled(app):
    app.config["PAYMENT_RENEWAL_ENABLED"] = False
    with app.app_context(), pytest.raises(PaymentDisabledError):
        PaymentService.prepare_billing_auth(1)


def test_billing_key_encryption_round_trip_never_returns_plaintext(app):
    app.config["BILLING_KEY_ENCRYPTION_KEY"] = Fernet.generate_key().decode("ascii")

    with app.app_context():
        encrypted = encrypt_text("billing-key")
        decrypted = decrypt_text(encrypted)

    assert encrypted != "billing-key"
    assert decrypted == "billing-key"


def test_other_members_customer_key_is_rejected_before_toss_call(app, monkeypatch):
    profile = SimpleNamespace(member_id=2, customer_key="customer-other")
    monkeypatch.setattr(
        MemberBillingProfileRepository,
        "get_by_customer_key",
        staticmethod(lambda provider, customer_key, for_update=False: profile),
    )
    monkeypatch.setattr(PaymentService, "_client", staticmethod(lambda: pytest.fail("Toss must not be called")))

    with app.app_context(), pytest.raises(PermissionError):
        PaymentService.confirm_billing_auth(1, "auth-key", "customer-other")


def test_billing_confirm_is_retry_safe_after_profile_activation(app, monkeypatch):
    app.config["BILLING_KEY_ENCRYPTION_KEY"] = Fernet.generate_key().decode("ascii")
    profile = SimpleNamespace(
        member_id=1, provider="TOSS", customer_key="customer-1", status="pending",
        encrypted_billing_key=None, encryption_key_version=None,
        card_company=None, card_number_masked=None, authenticated_at=None,
        last_verified_at=None, revoked_at=None,
    )
    calls = []

    class FakeClient:
        def issue_billing_key(self, auth_key, customer_key):
            calls.append((auth_key, customer_key))
            return {"billingKey": "billing-key", "customerKey": customer_key, "card": {"number": "123456******7890"}}

    monkeypatch.setattr(MemberBillingProfileRepository, "get_by_customer_key", staticmethod(lambda *args, **kwargs: profile))
    monkeypatch.setattr(MemberBillingProfileRepository, "update", staticmethod(lambda item, data: [setattr(item, key, value) for key, value in data.items()] and item))
    monkeypatch.setattr(PaymentService, "_client", staticmethod(lambda: FakeClient()))
    monkeypatch.setattr(payment_service_module.db.session, "commit", lambda: None)
    monkeypatch.setattr(payment_service_module.db.session, "rollback", lambda: None)

    with app.app_context():
        PaymentService.confirm_billing_auth(1, "auth-key", "customer-1")
        PaymentService.confirm_billing_auth(1, "auth-key", "customer-1")

    assert len(calls) == 1
    assert profile.status == "active"
    assert profile.encrypted_billing_key


def test_active_profile_without_encrypted_key_is_reissued(app, monkeypatch):
    app.config["BILLING_KEY_ENCRYPTION_KEY"] = Fernet.generate_key().decode("ascii")
    profile = SimpleNamespace(
        member_id=1, provider="TOSS", customer_key="customer-1", status="active", encrypted_billing_key=None,
        encryption_key_version=None, card_company=None, card_number_masked=None,
        authenticated_at=None, last_verified_at=None, revoked_at=None,
    )
    calls = []
    monkeypatch.setattr(MemberBillingProfileRepository, "get_by_customer_key", staticmethod(lambda *args, **kwargs: profile))
    monkeypatch.setattr(MemberBillingProfileRepository, "update", staticmethod(lambda item, data: [setattr(item, key, value) for key, value in data.items()] and item))
    monkeypatch.setattr(PaymentService, "_client", staticmethod(lambda: SimpleNamespace(issue_billing_key=lambda *args: calls.append(args) or {"billingKey": "new-key", "customerKey": "customer-1"})))
    monkeypatch.setattr(payment_service_module.db.session, "commit", lambda: None)
    monkeypatch.setattr(payment_service_module.db.session, "rollback", lambda: None)

    with app.app_context():
        PaymentService.confirm_billing_auth(1, "auth", "customer-1")
    assert len(calls) == 1
    assert profile.encrypted_billing_key


def test_billing_customer_key_mismatch_rolls_back_without_save(app, monkeypatch):
    profile = SimpleNamespace(member_id=1, customer_key="customer-1", status="pending", encrypted_billing_key=None)
    updates = []
    rollbacks = []
    monkeypatch.setattr(MemberBillingProfileRepository, "get_by_customer_key", staticmethod(lambda *args, **kwargs: profile))
    monkeypatch.setattr(MemberBillingProfileRepository, "update", staticmethod(lambda *args: updates.append(args)))
    monkeypatch.setattr(PaymentService, "_client", staticmethod(lambda: SimpleNamespace(issue_billing_key=lambda *args: {"billingKey": "key", "customerKey": "other"})))
    monkeypatch.setattr(payment_service_module.db.session, "rollback", lambda: rollbacks.append(True))

    with app.app_context(), pytest.raises(PaymentVerificationError):
        PaymentService.confirm_billing_auth(1, "auth", "customer-1")
    assert updates == []
    assert rollbacks == [True]


def test_provider_approved_at_is_parsed_as_utc(app):
    with app.app_context():
        parsed = PaymentService._parse_provider_datetime("2026-08-03T16:30:00+09:00")
    assert parsed == datetime(2026, 8, 3, 7, 30, tzinfo=timezone.utc)


def test_invalid_provider_approved_at_uses_utc_fallback(app, monkeypatch):
    product, profile, transaction = _charge_objects()
    captured = {}
    subscription = SimpleNamespace(
        id=7, member_id=1, plan_id=2, status="active", started_at=None,
        current_period_start=None, current_period_end=None, cancel_at_period_end=False,
        canceled_at=None, payment_provider="TOSS", payment_customer_id="customer-1",
        payment_subscription_id="payment-1", provider_product_id="plus",
        provider_purchase_id="payment-1", last_verified_at=None, grace_period_end=None,
        ended_at=None, auto_renew=True, metadata_json=None, created_at=None, updated_at=None,
    )
    monkeypatch.setattr(SubscriptionRepository, "create_member_subscription", staticmethod(lambda data: captured.update(data) or subscription))
    monkeypatch.setattr(PaymentTransactionRepository, "update", staticmethod(lambda item, data: [setattr(item, key, value) for key, value in data.items()] and item))
    monkeypatch.setattr(payment_service_module.db.session, "flush", lambda: None)
    monkeypatch.setattr(payment_service_module.db.session, "commit", lambda: None)

    before = datetime.now(timezone.utc)
    with app.app_context():
        PaymentService._complete_initial_transaction(transaction, product, profile, {
            "paymentKey": "payment-1", "approvedAt": "invalid",
        })
    after = datetime.now(timezone.utc)

    assert before <= captured["current_period_start"] <= after
    assert captured["current_period_start"].tzinfo == timezone.utc
    assert transaction.approved_at == captured["current_period_start"]


def test_cancel_schedules_period_end_without_immediate_refund(app, monkeypatch):
    subscription = SimpleNamespace(
        id=3, member_id=1, plan_id=2, status="active", started_at=None,
        current_period_start=datetime.now(timezone.utc),
        current_period_end=datetime.now(timezone.utc) + timedelta(days=20),
        cancel_at_period_end=False, canceled_at=None, payment_provider="TOSS",
        payment_customer_id="customer", payment_subscription_id="payment", provider_product_id="plus",
        provider_purchase_id="payment", last_verified_at=None, grace_period_end=None, ended_at=None,
        auto_renew=True, metadata_json=None, created_at=None, updated_at=None,
    )
    monkeypatch.setattr(SubscriptionRepository, "get_current_paid_subscription", staticmethod(lambda member_id: subscription))
    monkeypatch.setattr(
        SubscriptionRepository,
        "update_member_subscription",
        staticmethod(lambda item, data: [setattr(item, key, value) for key, value in data.items()] and item),
    )
    monkeypatch.setattr(payment_service_module.db.session, "commit", lambda: None)

    with app.app_context():
        result = PaymentService.cancel_subscription(1)

    assert result["status"] == "cancel_scheduled"
    assert result["cancel_at_period_end"] is True
    assert result["auto_renew"] is False


def test_duplicate_webhook_is_idempotent(app, monkeypatch):
    existing = SimpleNamespace(processing_status="PROCESSED")
    monkeypatch.setattr(
        PaymentWebhookRepository,
        "get_by_deduplication_key",
        staticmethod(lambda provider, key, **kwargs: existing),
    )

    with app.app_context():
        result = PaymentService.process_webhook(
            {"eventType": "PAYMENT_STATUS_CHANGED", "paymentKey": "payment-key"},
            {"tosspayments-webhook-transmission-id": "event-1"},
        )

    assert result == {"duplicate": True, "status": "PROCESSED"}


def test_initial_charge_uses_db_amount_and_resumes_same_idempotency_key(app, monkeypatch):
    now = datetime.now(timezone.utc)
    product = SimpleNamespace(
        id=4, plan_id=2, amount=4900, currency="KRW", provider_product_id="filtory_plus_monthly",
        plan=SimpleNamespace(plan_name="Filtory Plus"),
    )
    profile = SimpleNamespace(
        id=5, status="active", encrypted_billing_key="encrypted", customer_key="customer-1",
    )
    fixed_key = uuid.uuid4()
    transaction = SimpleNamespace(
        id=6, member_id=1, subscription_id=None, subscription=None, provider="TOSS", transaction_type="INITIAL", order_id="fixed-order",
        payment_key=None, idempotency_key=fixed_key, amount=4900, currency="KRW", status="READY",
        requested_at=now, approved_at=None, canceled_at=None, failure_code=None, failure_message=None,
    )
    subscription = SimpleNamespace(
        id=7, member_id=1, plan_id=2, status="active", started_at=now, current_period_start=now,
        current_period_end=now + timedelta(days=30), cancel_at_period_end=False, canceled_at=None,
        payment_provider="TOSS", payment_customer_id="customer-1", payment_subscription_id="payment-1",
        provider_product_id="filtory_plus_monthly", provider_purchase_id="payment-1", last_verified_at=now,
        grace_period_end=None, ended_at=None, auto_renew=True, metadata_json=None, created_at=now, updated_at=now,
    )
    captured = {}

    class FakeClient:
        def charge_billing_key(self, billing_key, **kwargs):
            captured.update(billing_key=billing_key, **kwargs)
            return {
                "paymentKey": "payment-1", "status": "DONE", "orderId": "fixed-order",
                "totalAmount": 4900, "currency": "KRW",
            }

    monkeypatch.setattr(PaymentService, "get_plus_product", staticmethod(lambda: product))
    monkeypatch.setattr(PaymentService, "_client", staticmethod(lambda: FakeClient()))
    monkeypatch.setattr(SubscriptionRepository, "get_current_paid_subscription", staticmethod(lambda member_id: None))
    monkeypatch.setattr(SubscriptionRepository, "create_member_subscription", staticmethod(lambda data: subscription))
    monkeypatch.setattr(MemberBillingProfileRepository, "get_by_member_provider", staticmethod(lambda *args: profile))
    monkeypatch.setattr(PaymentTransactionRepository, "get_resumable_initial", staticmethod(lambda *args: transaction))
    monkeypatch.setattr(
        PaymentTransactionRepository,
        "update",
        staticmethod(lambda item, data: [setattr(item, key, value) for key, value in data.items()] and item),
    )
    monkeypatch.setattr(payment_service_module, "decrypt_text", lambda value: "plain-billing-key")
    monkeypatch.setattr(payment_service_module.db.session, "commit", lambda: None)
    monkeypatch.setattr(payment_service_module.db.session, "flush", lambda: None)

    with app.app_context():
        result = PaymentService.charge_initial_subscription(1)

    assert captured["amount"] == 4900
    assert captured["order_id"] == "fixed-order"
    assert captured["idempotency_key"] == fixed_key
    assert result["payment"]["amount"] == 4900
    assert "paymentKey" not in result["payment"]
    assert "payment_customer_id" not in result["subscription"]
    assert "payment_subscription_id" not in result["subscription"]
    assert "provider_purchase_id" not in result["subscription"]
    assert "metadata_json" not in result["subscription"]


def _charge_objects():
    now = datetime.now(timezone.utc)
    product = SimpleNamespace(
        id=4, plan_id=2, amount=4900, currency="KRW", provider_product_id="plus",
        plan=SimpleNamespace(plan_name="Filtory Plus"),
    )
    profile = SimpleNamespace(
        id=5, status="active", encrypted_billing_key="encrypted", customer_key="customer-1",
    )
    transaction = SimpleNamespace(
        id=6, member_id=1, subscription_id=None, subscription=None, billing_product=product,
        provider="TOSS", transaction_type="INITIAL", order_id="fixed-order",
        payment_key=None, idempotency_key=uuid.uuid4(), amount=4900, currency="KRW", status="READY",
        requested_at=now, approved_at=None, canceled_at=None, failure_code=None, failure_message=None,
        raw_response_json=None,
    )
    return product, profile, transaction


def _arrange_charge(app, monkeypatch, response_or_error):
    product, profile, transaction = _charge_objects()

    class FakeClient:
        def charge_billing_key(self, *args, **kwargs):
            if isinstance(response_or_error, Exception):
                raise response_or_error
            return response_or_error

    monkeypatch.setattr(PaymentService, "get_plus_product", staticmethod(lambda: product))
    monkeypatch.setattr(PaymentService, "_client", staticmethod(lambda: FakeClient()))
    monkeypatch.setattr(SubscriptionRepository, "get_current_paid_subscription", staticmethod(lambda member_id: None))
    monkeypatch.setattr(MemberBillingProfileRepository, "get_by_member_provider", staticmethod(lambda *args: profile))
    monkeypatch.setattr(PaymentTransactionRepository, "get_resumable_initial", staticmethod(lambda *args: transaction))
    monkeypatch.setattr(
        PaymentTransactionRepository,
        "update",
        staticmethod(lambda item, data: [setattr(item, key, value) for key, value in data.items()] and item),
    )
    monkeypatch.setattr(payment_service_module, "decrypt_text", lambda value: "plain-key")
    monkeypatch.setattr(payment_service_module.db.session, "commit", lambda: None)
    return transaction


@pytest.mark.parametrize(
    "response",
    [
        {"status": "WAITING_FOR_DEPOSIT", "paymentKey": "pay", "orderId": "fixed-order", "totalAmount": 4900, "currency": "KRW"},
        {"status": "DONE", "paymentKey": "pay", "orderId": "fixed-order", "totalAmount": 5000, "currency": "KRW"},
        {"status": "DONE", "paymentKey": "pay", "orderId": "other-order", "totalAmount": 4900, "currency": "KRW"},
        {"status": "DONE", "paymentKey": "", "orderId": "fixed-order", "totalAmount": 4900, "currency": "KRW"},
        {"status": "DONE", "paymentKey": "pay", "orderId": "fixed-order", "totalAmount": 4900, "currency": "USD"},
    ],
)
def test_invalid_approval_response_never_creates_subscription(app, monkeypatch, response):
    transaction = _arrange_charge(app, monkeypatch, response)
    monkeypatch.setattr(
        SubscriptionRepository,
        "create_member_subscription",
        staticmethod(lambda data: pytest.fail("subscription must not be created")),
    )

    with app.app_context(), pytest.raises(PaymentVerificationError):
        PaymentService.charge_initial_subscription(1)

    assert transaction.status == "VERIFICATION_REQUIRED"
    assert transaction.failure_code == "INVALID_PROVIDER_RESPONSE"


def test_uncertain_network_failure_keeps_resumable_transaction(app, monkeypatch):
    transaction = _arrange_charge(
        app, monkeypatch, TossPaymentsError(outcome_uncertain=True)
    )

    with app.app_context(), pytest.raises(TossPaymentsError):
        PaymentService.charge_initial_subscription(1)

    assert transaction.status == "IN_PROGRESS"
    assert transaction.failure_code == "PROVIDER_OUTCOME_UNKNOWN"


def test_concurrent_initial_creation_reuses_winning_order_and_idempotency(app, monkeypatch):
    product, profile, winning = _charge_objects()
    winning.order_id = "winning-order"
    calls = iter([None, winning])
    captured = {}

    class FakeClient:
        def charge_billing_key(self, billing_key, **kwargs):
            captured.update(kwargs)
            raise TossPaymentsError(outcome_uncertain=True)

    monkeypatch.setattr(PaymentService, "get_plus_product", staticmethod(lambda: product))
    monkeypatch.setattr(PaymentService, "_client", staticmethod(lambda: FakeClient()))
    monkeypatch.setattr(SubscriptionRepository, "get_current_paid_subscription", staticmethod(lambda member_id: None))
    monkeypatch.setattr(MemberBillingProfileRepository, "get_by_member_provider", staticmethod(lambda *args: profile))
    monkeypatch.setattr(PaymentTransactionRepository, "get_resumable_initial", staticmethod(lambda *args: next(calls)))
    monkeypatch.setattr(PaymentTransactionRepository, "create", staticmethod(lambda data: SimpleNamespace(**data)))
    monkeypatch.setattr(
        PaymentTransactionRepository, "update",
        staticmethod(lambda item, data: [setattr(item, key, value) for key, value in data.items()] and item),
    )
    monkeypatch.setattr(payment_service_module, "decrypt_text", lambda value: "plain-key")
    monkeypatch.setattr(
        payment_service_module.db.session, "flush",
        lambda: (_ for _ in ()).throw(IntegrityError("insert", {}, RuntimeError("duplicate"))),
    )
    monkeypatch.setattr(payment_service_module.db.session, "rollback", lambda: None)
    monkeypatch.setattr(payment_service_module.db.session, "commit", lambda: None)

    with app.app_context(), pytest.raises(TossPaymentsError):
        PaymentService.charge_initial_subscription(1)

    assert captured["order_id"] == "winning-order"
    assert captured["idempotency_key"] == winning.idempotency_key


def test_configured_timeout_is_passed_to_toss_client(app, monkeypatch):
    captured = {}

    class FakeTossClient:
        def __init__(self, secret, timeout):
            captured.update(secret=secret, timeout=timeout)

    app.config["TOSS_API_TIMEOUT_SECONDS"] = 73
    monkeypatch.setattr(payment_service_module, "TossPaymentsClient", FakeTossClient)

    with app.app_context():
        PaymentService._client()

    assert captured == {"secret": "test_secret_key", "timeout": 73}


def test_verification_required_is_covered_by_active_initial_unique_index():
    index = next(
        item for item in PaymentTransaction.__table__.indexes
        if item.name == "uq_payment_transactions_active_initial"
    )
    predicate = str(index.dialect_options["postgresql"]["where"])

    assert "VERIFICATION_REQUIRED" in predicate


def test_uncertain_retry_reuses_same_order_and_idempotency_key(app, monkeypatch):
    product, profile, transaction = _charge_objects()
    attempts = []

    class FakeClient:
        def charge_billing_key(self, billing_key, **kwargs):
            attempts.append((kwargs["order_id"], kwargs["idempotency_key"]))
            raise TossPaymentsError(
                status=409,
                code="IDEMPOTENT_REQUEST_PROCESSING",
                outcome_uncertain=True,
            )

    monkeypatch.setattr(PaymentService, "get_plus_product", staticmethod(lambda: product))
    monkeypatch.setattr(PaymentService, "_client", staticmethod(lambda: FakeClient()))
    monkeypatch.setattr(SubscriptionRepository, "get_current_paid_subscription", staticmethod(lambda member_id: None))
    monkeypatch.setattr(MemberBillingProfileRepository, "get_by_member_provider", staticmethod(lambda *args: profile))
    monkeypatch.setattr(PaymentTransactionRepository, "get_resumable_initial", staticmethod(lambda *args: transaction))
    monkeypatch.setattr(
        PaymentTransactionRepository, "update",
        staticmethod(lambda item, data: [setattr(item, key, value) for key, value in data.items()] and item),
    )
    monkeypatch.setattr(payment_service_module, "decrypt_text", lambda value: "plain-key")
    monkeypatch.setattr(payment_service_module.db.session, "commit", lambda: None)

    with app.app_context():
        for _ in range(2):
            with pytest.raises(TossPaymentsError):
                PaymentService.charge_initial_subscription(1)

    assert attempts == [
        (transaction.order_id, transaction.idempotency_key),
        (transaction.order_id, transaction.idempotency_key),
    ]


def test_verification_required_without_payment_key_recovers_by_order_id(app, monkeypatch):
    product, profile, transaction = _charge_objects()
    transaction.status = "VERIFICATION_REQUIRED"
    transaction.payment_key = None
    now = datetime.now(timezone.utc)
    subscription = SimpleNamespace(
        id=8, member_id=1, plan_id=2, status="active", started_at=now,
        current_period_start=now, current_period_end=now + timedelta(days=30),
        cancel_at_period_end=False, canceled_at=None, payment_provider="TOSS",
        payment_customer_id="customer-1", payment_subscription_id="recovered-payment",
        provider_product_id="plus", provider_purchase_id="recovered-payment",
        last_verified_at=now, grace_period_end=None, ended_at=None, auto_renew=True,
        metadata_json=None, created_at=now, updated_at=now,
    )
    calls = []

    class FakeClient:
        def get_payment_by_order_id(self, order_id):
            calls.append(order_id)
            return {
                "status": "DONE",
                "paymentKey": "recovered-payment",
                "orderId": transaction.order_id,
                "totalAmount": product.amount,
                "currency": product.currency,
            }

        def charge_billing_key(self, *args, **kwargs):
            pytest.fail("verification-required transaction must not create a new charge")

    monkeypatch.setattr(PaymentService, "get_plus_product", staticmethod(lambda: product))
    monkeypatch.setattr(PaymentService, "_client", staticmethod(lambda: FakeClient()))
    monkeypatch.setattr(SubscriptionRepository, "get_current_paid_subscription", staticmethod(lambda member_id: None))
    monkeypatch.setattr(SubscriptionRepository, "create_member_subscription", staticmethod(lambda data: subscription))
    monkeypatch.setattr(MemberBillingProfileRepository, "get_by_member_provider", staticmethod(lambda *args: profile))
    monkeypatch.setattr(PaymentTransactionRepository, "get_resumable_initial", staticmethod(lambda *args: transaction))
    monkeypatch.setattr(
        PaymentTransactionRepository, "update",
        staticmethod(lambda item, data: [setattr(item, key, value) for key, value in data.items()] and item),
    )
    monkeypatch.setattr(payment_service_module, "decrypt_text", lambda value: "plain-key")
    monkeypatch.setattr(payment_service_module.db.session, "flush", lambda: None)
    monkeypatch.setattr(payment_service_module.db.session, "commit", lambda: None)

    with app.app_context():
        result = PaymentService.charge_initial_subscription(1)

    assert calls == [transaction.order_id]
    assert transaction.status == "DONE"
    assert transaction.payment_key == "recovered-payment"
    assert result["subscription"]["id"] == 8


@pytest.mark.parametrize(
    "provider_response",
    [
        {"status": "DONE", "paymentKey": "payment-1", "orderId": "fixed-order", "totalAmount": 9999, "currency": "KRW"},
        {"status": "DONE", "paymentKey": "payment-1", "orderId": "other-order", "totalAmount": 4900, "currency": "KRW"},
    ],
)
def test_verification_failure_reconciliation_never_creates_new_order(app, monkeypatch, provider_response):
    product, profile, transaction = _charge_objects()
    transaction.status = "VERIFICATION_REQUIRED"
    transaction.payment_key = "payment-1"

    class FakeClient:
        def get_payment(self, payment_key):
            return provider_response

        def charge_billing_key(self, *args, **kwargs):
            pytest.fail("reconciliation must not create a new charge")

    monkeypatch.setattr(PaymentService, "get_plus_product", staticmethod(lambda: product))
    monkeypatch.setattr(PaymentService, "_client", staticmethod(lambda: FakeClient()))
    monkeypatch.setattr(SubscriptionRepository, "get_current_paid_subscription", staticmethod(lambda member_id: None))
    monkeypatch.setattr(MemberBillingProfileRepository, "get_by_member_provider", staticmethod(lambda *args: profile))
    monkeypatch.setattr(PaymentTransactionRepository, "get_resumable_initial", staticmethod(lambda *args: transaction))
    monkeypatch.setattr(PaymentTransactionRepository, "create", staticmethod(lambda data: pytest.fail("new order forbidden")))
    monkeypatch.setattr(
        PaymentTransactionRepository, "update",
        staticmethod(lambda item, data: [setattr(item, key, value) for key, value in data.items()] and item),
    )
    monkeypatch.setattr(payment_service_module, "decrypt_text", lambda value: "plain-key")
    monkeypatch.setattr(payment_service_module.db.session, "commit", lambda: None)

    with app.app_context(), pytest.raises(PaymentVerificationError):
        PaymentService.charge_initial_subscription(1)

    assert transaction.status == "VERIFICATION_REQUIRED"


def test_unknown_webhook_payment_key_does_not_call_provider(app, monkeypatch):
    event = SimpleNamespace(
        processing_status="RECEIVED", processed_at=None, error_message=None, payment_key="unknown"
    )
    monkeypatch.setattr(
        PaymentWebhookRepository, "get_by_deduplication_key",
        staticmethod(lambda *args, **kwargs: event),
    )
    monkeypatch.setattr(
        PaymentWebhookRepository, "update",
        staticmethod(lambda item, data: [setattr(item, key, value) for key, value in data.items()] and item),
    )
    monkeypatch.setattr(
        PaymentTransactionRepository, "get_by_payment_key", staticmethod(lambda *args: None)
    )
    monkeypatch.setattr(PaymentService, "_client", staticmethod(lambda: pytest.fail("provider must not be called")))
    monkeypatch.setattr(payment_service_module.db.session, "commit", lambda: None)

    with app.app_context():
        result = PaymentService.process_webhook(
            {"eventType": "PAYMENT_STATUS_CHANGED", "paymentKey": "unknown"},
            {"tosspayments-webhook-transmission-id": "unknown-event"},
        )

    assert result == {"duplicate": False, "status": "IGNORED"}


def test_payment_summary_omits_provider_identifiers(app, monkeypatch):
    product, profile, transaction = _charge_objects()
    profile.provider = "TOSS"
    profile.card_company = "TEST"
    profile.card_number_masked = "****-1234"
    profile.authenticated_at = None
    profile.last_verified_at = None
    transaction.payment_key = "secret-payment-key"
    transaction.raw_response_json = {"provider": "raw"}
    subscription = SimpleNamespace(
        id=8, member_id=1, plan_id=product.plan_id, status="active",
        started_at=None, current_period_start=None, current_period_end=None,
        cancel_at_period_end=False, canceled_at=None, payment_provider="TOSS",
        payment_customer_id="secret-customer", payment_subscription_id="secret-subscription",
        provider_product_id="plus", provider_purchase_id="secret-purchase",
        last_verified_at=None, grace_period_end=None, ended_at=None, auto_renew=True,
        metadata_json={"internal": True}, created_at=None, updated_at=None,
    )
    monkeypatch.setattr(SubscriptionRepository, "get_current_paid_subscription", staticmethod(lambda member_id: subscription))
    monkeypatch.setattr(MemberBillingProfileRepository, "get_by_member_provider", staticmethod(lambda *args: profile))
    monkeypatch.setattr(PaymentTransactionRepository, "list_by_member", staticmethod(lambda member_id: [transaction]))

    with app.app_context():
        result = PaymentService.get_my_payments(1)

    assert "customerKey" not in result["billingProfile"]
    assert "paymentKey" not in result["transactions"][0]
    forbidden = {
        "payment_customer_id", "payment_subscription_id", "provider_purchase_id",
        "raw_response_json", "metadata_json", "idempotency_key",
    }
    assert forbidden.isdisjoint(result["subscription"])
    assert forbidden.isdisjoint(result["transactions"][0])


def test_billing_prepare_keeps_customer_key_for_toss_sdk(app, monkeypatch):
    product, profile, _ = _charge_objects()
    product.provider = "TOSS"
    product.billing_interval = "month"
    product.plan.plan_code = "plus"
    profile.member_id = 1
    profile.provider = "TOSS"
    monkeypatch.setattr(PaymentService, "get_plus_product", staticmethod(lambda: product))
    monkeypatch.setattr(MemberBillingProfileRepository, "get_by_member_provider", staticmethod(lambda *args: profile))
    monkeypatch.setattr(
        MemberBillingProfileRepository,
        "update",
        staticmethod(lambda item, data: [setattr(item, key, value) for key, value in data.items()] and item),
    )
    monkeypatch.setattr(payment_service_module.db.session, "commit", lambda: None)

    with app.app_context():
        result = PaymentService.prepare_billing_auth(1)

    assert result["customerKey"] == "customer-1"


@pytest.mark.parametrize("starting_status", ["RECEIVED", "FAILED"])
def test_incomplete_webhook_is_reprocessed_from_provider_state(app, monkeypatch, starting_status):
    product, _, transaction = _charge_objects()
    subscription = SimpleNamespace(
        status="active", auto_renew=True, cancel_at_period_end=False,
        canceled_at=None, ended_at=None, last_verified_at=None,
    )
    transaction.payment_key = "payment-1"
    transaction.subscription = subscription
    event = SimpleNamespace(
        processing_status=starting_status, processed_at=None, error_message="old", payment_key="payment-1"
    )
    monkeypatch.setattr(
        PaymentWebhookRepository, "get_by_deduplication_key",
        staticmethod(lambda *args, **kwargs: event),
    )
    monkeypatch.setattr(
        PaymentWebhookRepository, "update",
        staticmethod(lambda item, data: [setattr(item, key, value) for key, value in data.items()] and item),
    )
    monkeypatch.setattr(
        PaymentTransactionRepository, "get_by_payment_key", staticmethod(lambda *args: transaction)
    )
    monkeypatch.setattr(
        PaymentTransactionRepository, "update",
        staticmethod(lambda item, data: [setattr(item, key, value) for key, value in data.items()] and item),
    )
    monkeypatch.setattr(
        SubscriptionRepository, "update_member_subscription",
        staticmethod(lambda item, data: [setattr(item, key, value) for key, value in data.items()] and item),
    )

    class FakeClient:
        def get_payment(self, payment_key):
            return {
                "status": "CANCELED", "paymentKey": payment_key, "orderId": "fixed-order",
                "totalAmount": 4900, "currency": "KRW", "balanceAmount": 0,
            }

    monkeypatch.setattr(PaymentService, "_client", staticmethod(lambda: FakeClient()))
    monkeypatch.setattr(payment_service_module.db.session, "commit", lambda: None)
    monkeypatch.setattr(payment_service_module.db.session, "rollback", lambda: None)

    with app.app_context():
        result = PaymentService.process_webhook(
            {"eventType": "PAYMENT_STATUS_CHANGED", "data": {"paymentKey": "payment-1", "status": "DONE"}},
            {"tosspayments-webhook-transmission-id": "transmission-1"},
        )

    assert result == {"duplicate": False, "status": "PROCESSED"}
    assert transaction.status == "CANCELED"
    assert subscription.status == "refunded"
    assert subscription.auto_renew is False
    assert subscription.ended_at is not None
