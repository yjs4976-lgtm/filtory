from types import SimpleNamespace

import pytest
from flask import Flask
from flask_jwt_extended import JWTManager, create_access_token

from app.api.analysis_api import analysis_bp
from app.api.membership_api import membership_bp
from app.repositories import AnalysisUsageRepository
from app.repositories.member_repository import MemberRepository


@pytest.fixture
def usage_state(monkeypatch):
    state = {
        "logs": [],
        "results": {
            101: SimpleNamespace(id=101, member_id=1),
            102: SimpleNamespace(id=102, member_id=1),
            201: SimpleNamespace(id=201, member_id=2),
        },
        "subscriptions": {},
    }

    monkeypatch.setattr(
        AnalysisUsageRepository,
        "get_analysis_result",
        staticmethod(lambda analysis_id: state["results"].get(analysis_id)),
    )
    monkeypatch.setattr(AnalysisUsageRepository, "lock_member", staticmethod(lambda member_id: member_id))
    monkeypatch.setattr(
        AnalysisUsageRepository,
        "get_log",
        staticmethod(
            lambda member_id, analysis_id: next(
                (
                    log
                    for log in state["logs"]
                    if log.member_id == member_id and log.analysis_result_id == analysis_id
                ),
                None,
            )
        ),
    )
    monkeypatch.setattr(
        AnalysisUsageRepository,
        "count_period_usage",
        staticmethod(
            lambda member_id, period_key: sum(
                log.member_id == member_id and log.period_key == period_key for log in state["logs"]
            )
        ),
    )

    def create_log(data):
        log = SimpleNamespace(**data)
        state["logs"].append(log)
        return log

    monkeypatch.setattr(AnalysisUsageRepository, "create_log", staticmethod(create_log))
    monkeypatch.setattr(
        AnalysisUsageRepository,
        "get_current_subscription",
        staticmethod(lambda member_id: state["subscriptions"].get(member_id)),
    )
    monkeypatch.setattr(AnalysisUsageRepository, "commit", staticmethod(lambda: None))
    monkeypatch.setattr(AnalysisUsageRepository, "rollback", staticmethod(lambda: None))
    return state


@pytest.fixture
def app(monkeypatch, usage_state):
    flask_app = Flask(__name__)
    flask_app.config.update(TESTING=True, JWT_SECRET_KEY="test-secret-key")
    JWTManager(flask_app)
    flask_app.register_blueprint(analysis_bp, url_prefix="/api/analysis")
    flask_app.register_blueprint(membership_bp, url_prefix="/api/membership")

    members = {
        1: SimpleNamespace(id=1, role="user", active=True, deleted_at=None),
        2: SimpleNamespace(id=2, role="user", active=True, deleted_at=None),
    }
    monkeypatch.setattr(MemberRepository, "get_by_id", staticmethod(lambda member_id: members.get(member_id)))
    return flask_app


@pytest.fixture
def client(app):
    return app.test_client()


def auth_header(app, member_id=1):
    with app.app_context():
        token = create_access_token(identity=str(member_id))
    return {"Authorization": f"Bearer {token}"}


def test_usage_requires_login(client):
    assert client.get("/api/analysis/usage/me").status_code == 401


def test_free_usage_starts_with_five_remaining(app, client):
    response = client.get("/api/analysis/usage/me", headers=auth_header(app))
    usage = response.get_json()["data"]

    assert response.status_code == 200
    assert usage["baseLimit"] == 5
    assert usage["usedCount"] == 0
    assert usage["remainingCount"] == 5
    assert usage["canUseDetailedAnalysis"] is True


def test_free_usage_is_exhausted_after_five(app, client, usage_state):
    period_key = __import__("datetime").datetime.now(__import__("datetime").timezone.utc).strftime("%Y-%m")
    usage_state["logs"] = [
        SimpleNamespace(member_id=1, analysis_result_id=index, period_key=period_key)
        for index in range(1, 6)
    ]

    usage = client.get("/api/analysis/usage/me", headers=auth_header(app)).get_json()["data"]

    assert usage["usedCount"] == 5
    assert usage["remainingCount"] == 0
    assert usage["canUseDetailedAnalysis"] is False


def test_charge_is_idempotent_for_same_analysis(app, client):
    headers = auth_header(app)
    first = client.post("/api/analysis/usage/charge", json={"analysis_result_id": 101}, headers=headers)
    second = client.post("/api/analysis/usage/charge", json={"analysis_result_id": 101}, headers=headers)

    assert first.status_code == 200
    assert first.get_json()["data"]["charged"] is True
    assert second.status_code == 200
    assert second.get_json()["data"]["alreadyCharged"] is True
    assert second.get_json()["data"]["usedCount"] == 1


def test_mock_plus_has_thirty_base_limit(app, client, usage_state):
    usage_state["subscriptions"][1] = SimpleNamespace(
        plan=SimpleNamespace(plan_code="pro"),
        payment_provider="MOCK",
        current_period_start=None,
        current_period_end=None,
    )

    membership = client.get("/api/membership/me", headers=auth_header(app)).get_json()["data"]

    assert membership["plan"] == "PLUS"
    assert membership["provider"] == "MOCK"
    assert membership["baseLimit"] == 30


def test_access_rejects_other_members_analysis(app, client):
    response = client.get("/api/analysis/201/access", headers=auth_header(app, 1))

    assert response.status_code == 403


def test_charge_does_not_increase_over_limit(app, client, usage_state):
    period_key = __import__("datetime").datetime.now(__import__("datetime").timezone.utc).strftime("%Y-%m")
    usage_state["logs"] = [
        SimpleNamespace(member_id=1, analysis_result_id=index, period_key=period_key)
        for index in range(1, 6)
    ]

    response = client.post(
        "/api/analysis/usage/charge",
        json={"analysis_result_id": 102},
        headers=auth_header(app),
    )
    usage = response.get_json()["data"]

    assert response.status_code == 409
    assert usage["charged"] is False
    assert usage["usedCount"] == 5
    assert len(usage_state["logs"]) == 5
