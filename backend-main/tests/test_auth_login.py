from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import pytest
from flask import Flask

from app.api.auth_api import auth_bp
from app.repositories.member_repository import MemberRepository
from app.services.auth_service import AuthService, LoginLockedError
from app.utils.security import hash_password


def _member(member_id, password):
    return SimpleNamespace(
        id=member_id,
        active=True,
        deleted_at=None,
        password_hash=hash_password(password),
        last_login_at=None,
        failed_login_count=0,
        last_failed_login_at=None,
        login_locked_until=None,
    )


def _patch_login_success_dependencies(monkeypatch):
    monkeypatch.setattr("app.services.auth_service.db.session.commit", lambda: None)
    monkeypatch.setattr(
        "app.services.auth_service.db.session.rollback",
        lambda: None,
    )
    monkeypatch.setattr(
        "app.services.auth_service.member_to_dict",
        lambda member: {"id": member.id},
    )
    monkeypatch.setattr(
        "app.services.auth_service.TokenService.create_token_pair",
        staticmethod(
            lambda member, provider, fresh: {
                "access_token": "access-token",
                "refresh_token": "refresh-token",
            }
        ),
    )


def test_login_checks_all_matching_identifier_candidates(monkeypatch):
    wrong_email_match = _member(1, "wrong-password")
    correct_email_match = _member(2, "correct-password")

    monkeypatch.setattr(
        MemberRepository,
        "list_by_login_identifier_for_update",
        staticmethod(lambda identifier: [wrong_email_match, correct_email_match]),
    )
    _patch_login_success_dependencies(monkeypatch)

    result = AuthService.login(
        {
            "identifier": "User@Example.COM",
            "password": "correct-password",
        }
    )

    assert result["member"] == {"id": 2}
    assert result["access_token"] == "access-token"
    assert correct_email_match.last_login_at is not None
    assert wrong_email_match.failed_login_count == 0


def test_login_locks_account_after_repeated_failures(monkeypatch):
    member = _member(1, "correct-password")

    monkeypatch.setattr(
        MemberRepository,
        "list_by_login_identifier_for_update",
        staticmethod(lambda identifier: [member]),
    )
    monkeypatch.setattr(AuthService, "_login_failure_limit", staticmethod(lambda: 2))
    monkeypatch.setattr(AuthService, "_login_lockout_minutes", staticmethod(lambda: 5))
    monkeypatch.setattr("app.services.auth_service.db.session.commit", lambda: None)
    monkeypatch.setattr(
        "app.services.auth_service.db.session.rollback",
        lambda: None,
    )

    with pytest.raises(ValueError, match="Invalid login ID"):
        AuthService.login({"identifier": "user", "password": "wrong-password"})

    assert member.failed_login_count == 1
    assert member.login_locked_until is None

    with pytest.raises(LoginLockedError, match="Too many failed login attempts"):
        AuthService.login({"identifier": "user", "password": "wrong-password"})

    assert member.failed_login_count == 2
    assert member.login_locked_until is not None


def test_successful_login_clears_failure_state(monkeypatch):
    member = _member(1, "correct-password")
    member.failed_login_count = 3
    member.last_failed_login_at = object()
    member.login_locked_until = None

    monkeypatch.setattr(
        MemberRepository,
        "list_by_login_identifier_for_update",
        staticmethod(lambda identifier: [member]),
    )
    _patch_login_success_dependencies(monkeypatch)

    result = AuthService.login(
        {
            "identifier": "user",
            "password": "correct-password",
        }
    )

    assert result["member"] == {"id": 1}
    assert member.failed_login_count == 0
    assert member.last_failed_login_at is None
    assert member.login_locked_until is None


def test_expired_login_lock_resets_failure_counter(monkeypatch):
    now = datetime.now(timezone.utc)
    member = _member(1, "correct-password")
    member.failed_login_count = 5
    member.last_failed_login_at = now - timedelta(minutes=5)
    member.login_locked_until = now - timedelta(seconds=1)

    AuthService._clear_expired_login_lock(member, now)

    assert member.failed_login_count == 0
    assert member.last_failed_login_at is None
    assert member.login_locked_until is None

    monkeypatch.setattr(AuthService, "_login_failure_limit", staticmethod(lambda: 5))

    locked_until = AuthService._record_failed_login_attempt(member, now)

    assert member.failed_login_count == 1
    assert locked_until is None


def test_login_endpoint_returns_too_many_requests_for_locked_account(monkeypatch):
    app = Flask(__name__)
    app.register_blueprint(auth_bp, url_prefix="/api/auth")

    def raise_locked(payload):
        raise LoginLockedError("Too many failed login attempts.", retry_after_seconds=300)

    monkeypatch.setattr(AuthService, "login", staticmethod(raise_locked))

    response = app.test_client().post(
        "/api/auth/login",
        json={"identifier": "user", "password": "wrong-password"},
    )

    assert response.status_code == 429
    assert response.headers["Retry-After"] == "300"
    assert response.get_json()["message"] == "Too many failed login attempts."
    assert response.get_json()["data"]["retryAfterSeconds"] == 300
