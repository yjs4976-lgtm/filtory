from types import SimpleNamespace
import hashlib
import hmac
import json

import pytest
from flask import Flask
from flask_jwt_extended import JWTManager, create_access_token

from app.api.payment_api import payment_bp
from app.repositories.member_repository import MemberRepository
from app.services.payment_service import PaymentService


@pytest.fixture
def app(monkeypatch):
    flask_app = Flask(__name__)
    flask_app.config.update(TESTING=True, JWT_SECRET_KEY="test-secret-key", PAYMENT_ENABLED=False)
    JWTManager(flask_app)
    flask_app.register_blueprint(payment_bp, url_prefix="/api/payments")
    monkeypatch.setattr(
        MemberRepository,
        "get_by_id",
        staticmethod(lambda member_id: SimpleNamespace(id=member_id, role="user", active=True, deleted_at=None)),
    )
    return flask_app


def auth_header(app, member_id=1):
    with app.app_context():
        return {"Authorization": f"Bearer {create_access_token(identity=str(member_id))}"}


@pytest.mark.parametrize(
    ("path", "payload"),
    [
        ("/api/payments/billing/prepare", {}),
        ("/api/payments/billing/confirm", {"authKey": "auth", "customerKey": "customer"}),
        ("/api/payments/subscriptions/charge", {"amount": 1}),
        ("/api/payments/subscriptions/cancel", {}),
    ],
)
def test_payment_mutations_are_disabled_by_default(app, path, payload):
    response = app.test_client().post(path, json=payload, headers=auth_header(app))

    assert response.status_code == 503


def test_payment_summary_is_readable_while_payments_are_disabled(app, monkeypatch):
    monkeypatch.setattr(
        PaymentService,
        "get_my_payments",
        staticmethod(lambda member_id: {"paymentEnabled": False, "subscription": None, "transactions": []}),
    )

    response = app.test_client().get("/api/payments/me", headers=auth_header(app))

    assert response.status_code == 200
    assert response.get_json()["data"]["paymentEnabled"] is False


def test_charge_endpoint_never_forwards_client_amount(app, monkeypatch):
    captured = {}
    app.config["PAYMENT_ENABLED"] = True

    def charge(member_id):
        captured["member_id"] = member_id
        return {"payment": {"amount": 4900}}

    monkeypatch.setattr(PaymentService, "charge_initial_subscription", staticmethod(charge))

    response = app.test_client().post(
        "/api/payments/subscriptions/charge",
        json={"amount": 1, "productId": "tampered"},
        headers=auth_header(app, 7),
    )

    assert response.status_code == 201
    assert captured == {"member_id": 7}
    assert response.get_json()["data"]["payment"]["amount"] == 4900


def test_toss_webhook_rejects_invalid_signature(app):
    app.config.update(PAYMENT_ENABLED=True, TOSS_WEBHOOK_SECRET="webhook-secret")

    response = app.test_client().post(
        "/api/payments/webhooks/toss",
        json={"eventType": "PAYMENT_STATUS_CHANGED"},
        headers={"X-Toss-Signature": "invalid"},
    )

    assert response.status_code == 401


def test_toss_webhook_accepts_valid_signature(app, monkeypatch):
    app.config.update(PAYMENT_ENABLED=True, TOSS_WEBHOOK_SECRET="webhook-secret")
    payload = {"eventType": "PAYMENT_STATUS_CHANGED", "paymentKey": "payment-1"}
    raw = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    signature = hmac.new(b"webhook-secret", raw, hashlib.sha256).hexdigest()
    monkeypatch.setattr(
        PaymentService,
        "process_webhook",
        staticmethod(lambda received, headers: {"duplicate": False, "status": "PROCESSED"}),
    )

    response = app.test_client().post(
        "/api/payments/webhooks/toss",
        data=raw,
        content_type="application/json",
        headers={"X-Toss-Signature": signature},
    )

    assert response.status_code == 200
    assert response.get_json()["data"]["status"] == "PROCESSED"
