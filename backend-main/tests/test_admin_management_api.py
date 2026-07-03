from types import SimpleNamespace

import pytest
from flask import Flask
from flask_jwt_extended import JWTManager, create_access_token

from app.api.admin_api import admin_bp
from app.repositories.member_repository import MemberRepository
from app.services import AdminService


@pytest.fixture
def app(monkeypatch):
    flask_app = Flask(__name__)
    flask_app.config.update(
        TESTING=True,
        JWT_SECRET_KEY="test-secret-key",
    )
    JWTManager(flask_app)
    flask_app.register_blueprint(admin_bp, url_prefix="/api/admin")

    members = {
        9: SimpleNamespace(id=9, role="admin", active=True, deleted_at=None),
    }
    monkeypatch.setattr(MemberRepository, "get_by_id", staticmethod(lambda member_id: members.get(member_id)))

    return flask_app


@pytest.fixture
def client(app):
    return app.test_client()


def auth_header(app):
    with app.app_context():
        token = create_access_token(identity="9")
    return {"Authorization": f"Bearer {token}"}


def test_admin_review_cases_returns_total_count_for_second_page(app, client, monkeypatch):
    def fake_list_review_cases(**kwargs):
        assert kwargs["limit"] == 20
        assert kwargs["offset"] == 20
        return ([{"id": index} for index in range(21, 26)], 25)

    monkeypatch.setattr(AdminService, "list_review_cases", staticmethod(fake_list_review_cases))

    response = client.get("/api/admin/reviews?page=2&per_page=20", headers=auth_header(app))
    body = response.get_json()

    assert response.status_code == 200
    assert len(body["data"]) == 5
    assert body["meta"]["page"] == 2
    assert body["meta"]["per_page"] == 20
    assert body["meta"]["count"] == 25


def test_admin_hospitals_returns_total_count_for_second_page(app, client, monkeypatch):
    def fake_list_hospitals(**kwargs):
        assert kwargs["limit"] == 20
        assert kwargs["offset"] == 20
        return ([{"id": index} for index in range(21, 26)], 25)

    monkeypatch.setattr(AdminService, "list_hospitals", staticmethod(fake_list_hospitals))

    response = client.get("/api/admin/hospitals?page=2&per_page=20", headers=auth_header(app))
    body = response.get_json()

    assert response.status_code == 200
    assert len(body["data"]) == 5
    assert body["meta"]["page"] == 2
    assert body["meta"]["per_page"] == 20
    assert body["meta"]["count"] == 25
