from types import SimpleNamespace

import pytest
from flask import Flask
from flask_jwt_extended import JWTManager, create_access_token

from app.api.subscription_api import subscription_bp
from app.repositories.member_repository import MemberRepository
from app.services import SubscriptionService


@pytest.fixture
def app(monkeypatch):
    flask_app = Flask(__name__)
    flask_app.config.update(
        TESTING=True,
        JWT_SECRET_KEY="test-secret-key",
    )
    JWTManager(flask_app)
    flask_app.register_blueprint(subscription_bp, url_prefix="/api/subscriptions")

    members = {
        1: SimpleNamespace(id=1, role="user", active=True, deleted_at=None),
        2: SimpleNamespace(id=2, role="user", active=True, deleted_at=None),
        9: SimpleNamespace(id=9, role="admin", active=True, deleted_at=None),
    }

    monkeypatch.setattr(MemberRepository, "get_by_id", staticmethod(lambda member_id: members.get(member_id)))
    monkeypatch.setattr(
        SubscriptionService,
        "get_current_member_subscription",
        staticmethod(lambda member_id: {"member_id": member_id, "status": "active"}),
    )
    monkeypatch.setattr(
        SubscriptionService,
        "create_member_subscription",
        staticmethod(lambda payload: {"id": 10, **payload}),
    )
    monkeypatch.setattr(
        SubscriptionService,
        "update_member_subscription",
        staticmethod(lambda subscription_id, payload: {"id": subscription_id, **payload}),
    )

    return flask_app


@pytest.fixture
def client(app):
    return app.test_client()


def auth_header(app, member_id):
    with app.app_context():
        token = create_access_token(identity=str(member_id))
    return {"Authorization": f"Bearer {token}"}


def test_current_subscription_requires_login(client):
    response = client.get("/api/subscriptions/members/1/current")

    assert response.status_code == 401


def test_member_can_read_own_current_subscription(app, client):
    response = client.get(
        "/api/subscriptions/members/1/current",
        headers=auth_header(app, 1),
    )

    assert response.status_code == 200


def test_member_cannot_read_other_member_current_subscription(app, client):
    response = client.get(
        "/api/subscriptions/members/2/current",
        headers=auth_header(app, 1),
    )

    assert response.status_code == 403


def test_member_cannot_create_or_update_subscription(app, client):
    create_response = client.post(
        "/api/subscriptions/members",
        json={"member_id": 1, "plan_id": 1},
        headers=auth_header(app, 1),
    )
    update_response = client.patch(
        "/api/subscriptions/members/10",
        json={"status": "active"},
        headers=auth_header(app, 1),
    )

    assert create_response.status_code == 403
    assert update_response.status_code == 403


def test_admin_can_manage_member_subscription(app, client):
    headers = auth_header(app, 9)

    read_response = client.get("/api/subscriptions/members/1/current", headers=headers)
    create_response = client.post(
        "/api/subscriptions/members",
        json={"member_id": 1, "plan_id": 1},
        headers=headers,
    )
    update_response = client.patch(
        "/api/subscriptions/members/10",
        json={"status": "active"},
        headers=headers,
    )

    assert read_response.status_code == 200
    assert create_response.status_code == 201
    assert update_response.status_code == 200
