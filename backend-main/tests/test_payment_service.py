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
from app.services.payment_service import PaymentService, PaymentVerificationError
from app.utils.crypto import BillingKeyEncryptionError, decrypt_text, encrypt_text


@pytest.fixture
def app():
    app = Flask(__name__)
    app.config.update(
        PAYMENT_ENABLED=True,
        PAYMENT_PROVIDER="TOSS",
        TOSS_CLIENT_KEY="test_client_key",
        TOSS_SECRET_KEY="test_secret_key",
        PAYMENT_SUCCESS_URL="http://localhost/payments/success",
        PAYMENT_FAIL_URL="http://localhost/payments/fail",
        BILLING_KEY_ENCRYPTION_KEY=None,
    )
    return app


def test_billing_encryption_key_is_required(app):
    with app.app_context(), pytest.raises(BillingKeyEncryptionError):
        encrypt_text("billing-key")


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
        staticmethod(lambda provider, customer_key: profile),
    )
    monkeypatch.setattr(PaymentService, "_client", staticmethod(lambda: pytest.fail("Toss must not be called")))

    with app.app_context(), pytest.raises(PermissionError):
        PaymentService.confirm_billing_auth(1, "auth-key", "customer-other")


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
        id=6, subscription_id=None, provider="TOSS", transaction_type="INITIAL", order_id="fixed-order",
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
        id=6, subscription_id=None, subscription=None, billing_product=product,
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

    assert transaction.status == "FAILED"
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
