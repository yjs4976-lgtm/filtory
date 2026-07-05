from types import SimpleNamespace

import pytest
from flask import Flask
from flask_jwt_extended import JWTManager, create_access_token

import app.services.member_service as member_service_module
from app.api.member_api import member_bp
from app.repositories.member_repository import MemberRepository
from app.schemas.member_schema import member_to_dict
from app.services import MemberService
from app.utils.security import hash_password, verify_password


@pytest.fixture
def app(monkeypatch):
    flask_app = Flask(__name__)
    flask_app.config.update(
        TESTING=True,
        JWT_SECRET_KEY="test-secret-key",
    )
    JWTManager(flask_app)
    flask_app.register_blueprint(member_bp, url_prefix="/api/members")

    members = {
        1: SimpleNamespace(id=1, role="user", active=True, deleted_at=None),
        2: SimpleNamespace(id=2, role="user", active=True, deleted_at=None),
        9: SimpleNamespace(id=9, role="admin", active=True, deleted_at=None),
    }

    monkeypatch.setattr(MemberRepository, "get_by_id", staticmethod(lambda member_id: members.get(member_id)))
    return flask_app


@pytest.fixture
def client(app):
    return app.test_client()


def auth_header(app, member_id, fresh=False):
    with app.app_context():
        token = create_access_token(identity=str(member_id), fresh=fresh)
    return {"Authorization": f"Bearer {token}"}


def test_member_password_change_requires_owner(app, client, monkeypatch):
    captured = {}

    def fake_change_password(member_id, current_password, new_password):
        captured.update(
            {
                "member_id": member_id,
                "current_password": current_password,
                "new_password": new_password,
            }
        )
        return {"changed": True}

    monkeypatch.setattr(MemberService, "change_password", staticmethod(fake_change_password))

    forbidden = client.patch(
        "/api/members/2/password",
        json={"currentPassword": "old-password", "newPassword": "new-password"},
        headers=auth_header(app, 1),
    )
    allowed = client.patch(
        "/api/members/1/password",
        json={"currentPassword": "old-password", "newPassword": "new-password"},
        headers=auth_header(app, 1),
    )

    assert forbidden.status_code == 403
    assert allowed.status_code == 200
    assert captured == {
        "member_id": 1,
        "current_password": "old-password",
        "new_password": "new-password",
    }


def test_deactivate_member_passes_password_to_service(app, client, monkeypatch):
    captured = {}

    def fake_deactivate_member(member_id, password=None, requester=None, fresh_auth=False):
        captured.update(
            {
                "member_id": member_id,
                "password": password,
                "requester_id": requester.id,
                "fresh_auth": fresh_auth,
            }
        )
        return {"id": member_id, "active": False}

    monkeypatch.setattr(MemberService, "deactivate_member", staticmethod(fake_deactivate_member))

    response = client.delete(
        "/api/members/1",
        json={"password": "current-password"},
        headers=auth_header(app, 1, fresh=True),
    )

    assert response.status_code == 200
    assert captured == {
        "member_id": 1,
        "password": "current-password",
        "requester_id": 1,
        "fresh_auth": True,
    }


def test_change_password_validates_current_password(monkeypatch):
    member = SimpleNamespace(
        id=1,
        active=True,
        deleted_at=None,
        password_hash=hash_password("old-password"),
        password_changed_at=None,
    )

    monkeypatch.setattr(MemberRepository, "get_by_id", staticmethod(lambda member_id: member if member_id == 1 else None))
    monkeypatch.setattr(
        member_service_module.db,
        "session",
        SimpleNamespace(commit=lambda: None, rollback=lambda: None),
    )

    with pytest.raises(ValueError):
        MemberService.change_password(1, "wrong-password", "new-password")

    result = MemberService.change_password(1, "old-password", "new-password")

    assert result == {"changed": True}
    assert verify_password(member.password_hash, "new-password")
    assert member.password_changed_at is not None


def test_change_password_rejects_social_only_account(monkeypatch):
    member = SimpleNamespace(
        id=1,
        active=True,
        deleted_at=None,
        password_hash=None,
        password_changed_at=None,
    )

    monkeypatch.setattr(MemberRepository, "get_by_id", staticmethod(lambda member_id: member if member_id == 1 else None))

    with pytest.raises(ValueError) as exc:
        MemberService.change_password(1, "anything", "new-password")

    assert "social login accounts" in str(exc.value)


def test_profile_update_cannot_change_password(monkeypatch):
    original_hash = hash_password("old-password")
    member = SimpleNamespace(
        id=1,
        active=True,
        deleted_at=None,
        password_hash=original_hash,
    )

    monkeypatch.setattr(MemberRepository, "get_by_id", staticmethod(lambda member_id: member if member_id == 1 else None))

    with pytest.raises(ValueError, match="password change endpoint"):
        MemberService.update_member(
            1,
            {
                "nickname": "changed",
                "password": "bypass-password",
                "newPassword": "another-bypass-password",
            },
        )

    assert member.password_hash == original_hash


def test_social_account_cannot_set_password_via_profile(monkeypatch):
    member = SimpleNamespace(
        id=1,
        active=True,
        deleted_at=None,
        password_hash=None,
    )

    monkeypatch.setattr(MemberRepository, "get_by_id", staticmethod(lambda member_id: member if member_id == 1 else None))

    with pytest.raises(ValueError, match="password change endpoint"):
        MemberService.update_member(1, {"password": "new-password"})

    assert member.password_hash is None


def test_local_account_deactivation_requires_current_password(monkeypatch):
    member = SimpleNamespace(
        id=1,
        active=True,
        deleted_at=None,
        password_hash=hash_password("old-password"),
        role="user",
    )

    monkeypatch.setattr(MemberRepository, "get_by_id", staticmethod(lambda member_id: member if member_id == 1 else None))

    with pytest.raises(ValueError, match="Current password is required"):
        MemberService.deactivate_member(1, requester=member)


def test_social_account_can_deactivate_without_password(monkeypatch):
    member = SimpleNamespace(
        id=1,
        active=True,
        deleted_at=None,
        password_hash=None,
        role="user",
        social_accounts=[SimpleNamespace(provider="google")],
    )

    monkeypatch.setattr(MemberRepository, "get_by_id", staticmethod(lambda member_id: member if member_id == 1 else None))
    monkeypatch.setattr(
        MemberRepository,
        "update",
        staticmethod(lambda target, data: [setattr(target, key, value) for key, value in data.items()] and target),
    )
    monkeypatch.setattr(
        member_service_module.db,
        "session",
        SimpleNamespace(commit=lambda: None, rollback=lambda: None),
    )
    monkeypatch.setattr(member_service_module, "member_to_dict", lambda target: {"id": target.id, "active": target.active})

    result = MemberService.deactivate_member(1, requester=member, fresh_auth=True)

    assert result == {"id": 1, "active": False}
    assert member.active is False
    assert member.status == "withdrawn"
    assert member.deleted_at is not None


def test_social_account_cannot_deactivate_without_fresh_auth(monkeypatch):
    member = SimpleNamespace(
        id=1,
        active=True,
        deleted_at=None,
        password_hash=None,
        role="user",
        social_accounts=[SimpleNamespace(provider="google")],
    )

    monkeypatch.setattr(MemberRepository, "get_by_id", staticmethod(lambda member_id: member if member_id == 1 else None))

    with pytest.raises(ValueError, match="Fresh account verification is required"):
        MemberService.deactivate_member(1, requester=member, fresh_auth=False)


def test_passwordless_non_social_account_cannot_deactivate(monkeypatch):
    member = SimpleNamespace(
        id=1,
        active=True,
        deleted_at=None,
        password_hash=None,
        role="user",
        social_accounts=[],
    )

    monkeypatch.setattr(MemberRepository, "get_by_id", staticmethod(lambda member_id: member if member_id == 1 else None))

    with pytest.raises(ValueError, match="Fresh account verification is required"):
        MemberService.deactivate_member(1, requester=member, fresh_auth=True)


def test_member_schema_exposes_password_and_social_provider_flags():
    member = SimpleNamespace(
        id=1,
        login_id=None,
        email="social@example.com",
        nickname="social-user",
        real_name=None,
        phone=None,
        profile_img_url=None,
        role="user",
        status="active",
        active=True,
        email_verified=True,
        last_login_at=None,
        password_changed_at=None,
        deleted_at=None,
        created_at=None,
        updated_at=None,
        password_hash=None,
        social_accounts=[
            SimpleNamespace(provider="naver"),
            SimpleNamespace(provider="kakao"),
        ],
    )

    data = member_to_dict(member)

    assert data["hasPassword"] is False
    assert data["socialProviders"] == {
        "google": False,
        "naver": True,
        "kakao": True,
    }
