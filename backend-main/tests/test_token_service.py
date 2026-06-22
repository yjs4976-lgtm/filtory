from types import SimpleNamespace

import pytest
from flask import Flask
from flask_jwt_extended import JWTManager, decode_token

from app.services.token_service import TokenService


@pytest.fixture
def app():
    app = Flask(__name__)
    app.config.update(
        TESTING=True,
        JWT_SECRET_KEY="test-secret-key",
    )
    JWTManager(app)
    return app


@pytest.fixture(autouse=True)
def clear_revoked_tokens():
    TokenService._revoked_jtis.clear()
    yield
    TokenService._revoked_jtis.clear()


def test_create_token_pair(app):
    member = SimpleNamespace(id=123)

    with app.app_context():
        tokens = TokenService.create_token_pair(
            member,
            provider="google",
            fresh=True,
        )
        access_payload = decode_token(tokens["access_token"])
        refresh_payload = decode_token(tokens["refresh_token"])

    assert set(tokens) == {"access_token", "refresh_token"}

    assert access_payload["sub"] == "123"
    assert access_payload["type"] == "access"
    assert access_payload["provider"] == "google"
    assert access_payload["fresh"] is True

    assert refresh_payload["sub"] == "123"
    assert refresh_payload["type"] == "refresh"
    assert refresh_payload["provider"] == "google"


def test_create_access_token_for_identity(app):
    with app.app_context():
        token = TokenService.create_access_token_for_identity(
            identity=999,
            provider="kakao",
        )
        payload = decode_token(token)

    assert payload["sub"] == "999"
    assert payload["type"] == "access"
    assert payload["provider"] == "kakao"
    assert payload["fresh"] is False


def test_revoke_jti_marks_token_as_revoked():
    jti = "test-jti"

    TokenService.revoke_jti(jti)

    assert TokenService.is_token_revoked(jti) is True


def test_unknown_jti_is_not_revoked():
    assert TokenService.is_token_revoked("unknown-jti") is False


def test_revoke_current_token(monkeypatch):
    monkeypatch.setattr(
        "app.services.token_service.get_jwt",
        lambda: {"jti": "current-token-jti"},
    )

    TokenService.revoke_current_token()

    assert TokenService.is_token_revoked("current-token-jti") is True
