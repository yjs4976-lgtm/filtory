from types import SimpleNamespace

import pytest
from flask import Flask
from flask_jwt_extended import JWTManager, create_access_token

from app.api.inquiry_api import inquiry_bp
from app.repositories.member_repository import MemberRepository
from app.services import InquiryService


@pytest.fixture
def app(monkeypatch):
    flask_app = Flask(__name__)
    flask_app.config.update(
        TESTING=True,
        JWT_SECRET_KEY="test-secret-key",
    )
    JWTManager(flask_app)
    flask_app.register_blueprint(inquiry_bp, url_prefix="/api")

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


def auth_header(app, member_id):
    with app.app_context():
        token = create_access_token(identity=str(member_id))
    return {"Authorization": f"Bearer {token}"}


def test_download_attachment_requires_login(client):
    response = client.get("/api/inquiries/1/attachment")

    assert response.status_code == 401


def test_owner_can_download_attachment(app, client, monkeypatch):
    def fake_attachment(member, inquiry_id):
        assert member.id == 1
        assert inquiry_id == 3
        return {
            "content": b"hello",
            "file_name": "proof.txt",
            "content_type": "text/plain",
        }

    monkeypatch.setattr(InquiryService, "get_attachment_for_member", staticmethod(fake_attachment))

    response = client.get("/api/inquiries/3/attachment", headers=auth_header(app, 1))

    assert response.status_code == 200
    assert response.data == b"hello"
    assert response.headers["Content-Type"].startswith("text/plain")


def test_admin_can_download_attachment(app, client, monkeypatch):
    def fake_attachment(member, inquiry_id):
        assert member.role == "admin"
        return {
            "content": b"admin",
            "file_name": "proof.txt",
            "content_type": "text/plain",
        }

    monkeypatch.setattr(InquiryService, "get_attachment_for_member", staticmethod(fake_attachment))

    response = client.get("/api/inquiries/3/attachment", headers=auth_header(app, 9))

    assert response.status_code == 200
    assert response.data == b"admin"


def test_download_attachment_rejects_other_member(app, client, monkeypatch):
    monkeypatch.setattr(
        InquiryService,
        "get_attachment_for_member",
        staticmethod(lambda member, inquiry_id: (_ for _ in ()).throw(ValueError("Inquiry attachment not found"))),
    )

    response = client.get("/api/inquiries/3/attachment", headers=auth_header(app, 2))

    assert response.status_code == 404
