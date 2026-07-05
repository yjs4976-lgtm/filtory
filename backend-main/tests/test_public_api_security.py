from types import SimpleNamespace

import pytest
from flask import Flask
from flask_jwt_extended import JWTManager, create_access_token

from app.api.analysis_api import analysis_bp
from app.api.hospital_api import hospital_bp
from app.api.report_api import report_bp
from app.repositories import AdminRepository, ReportRepository
from app.repositories.member_repository import MemberRepository
import app.services.report_service as report_service_module
from app.services import AnalysisService, HospitalService, ReportService


@pytest.fixture
def app(monkeypatch):
    flask_app = Flask(__name__)
    flask_app.config.update(
        TESTING=True,
        JWT_SECRET_KEY="test-secret-key",
    )
    JWTManager(flask_app)
    flask_app.register_blueprint(hospital_bp, url_prefix="/api/hospitals")
    flask_app.register_blueprint(report_bp, url_prefix="/api/reports")
    flask_app.register_blueprint(analysis_bp, url_prefix="/api/analysis")

    members = {
        1: SimpleNamespace(id=1, role="user", active=True, deleted_at=None),
        2: SimpleNamespace(id=2, role="user", active=True, deleted_at=None),
        9: SimpleNamespace(id=9, role="ADMIN", active=True, deleted_at=None),
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


def test_hospital_write_requires_admin(app, client, monkeypatch):
    monkeypatch.setattr(HospitalService, "create_hospital", staticmethod(lambda payload: {"id": 1, **payload}))

    user_response = client.post(
        "/api/hospitals/",
        json={"hospital_name": "테스트병원", "category": "dermatology"},
        headers=auth_header(app, 1),
    )
    admin_response = client.post(
        "/api/hospitals/",
        json={"hospital_name": "테스트병원", "category": "dermatology"},
        headers=auth_header(app, 9),
    )

    assert user_response.status_code == 403
    assert admin_response.status_code == 201


def test_report_create_requires_login_and_uses_current_member(app, client, monkeypatch):
    captured = {}

    def fake_create_report(payload):
        captured.update(payload)
        return {"id": 3, **payload}

    monkeypatch.setattr(ReportService, "create_report", staticmethod(fake_create_report))

    anonymous_response = client.post("/api/reports/", json={"report_type": "other"})
    user_response = client.post(
        "/api/reports/",
        json={
            "reporter_member_id": 999,
            "reporterMemberId": 888,
            "report_type": "other",
            "hospital_id": 1,
            "status": "resolved",
            "admin_member_id": 9,
            "adminMemberId": 9,
            "admin_response": "임의 처리",
            "adminResponse": "임의 처리",
            "resolved_at": "2026-07-05T00:00:00+09:00",
            "resolvedAt": "2026-07-05T00:00:00+09:00",
        },
        headers=auth_header(app, 1),
    )

    assert anonymous_response.status_code == 401
    assert user_response.status_code == 201
    assert captured["reporter_member_id"] == 1
    assert "reporterMemberId" not in captured
    assert captured["status"] == "pending"
    assert "admin_member_id" not in captured
    assert "adminMemberId" not in captured
    assert "admin_response" not in captured
    assert "adminResponse" not in captured
    assert "resolved_at" not in captured
    assert "resolvedAt" not in captured


def test_report_service_forces_pending_and_removes_admin_fields(monkeypatch):
    captured = {}
    report = SimpleNamespace(
        id=3,
        reporter_member_id=1,
        hospital_id=1,
        review_id=None,
        analysis_result_id=None,
        report_type="other",
        report_reason=None,
        status="pending",
        admin_member_id=None,
        admin_memo=None,
        resolved_at=None,
        created_at=None,
        updated_at=None,
    )

    def fake_create(data):
        captured.update(data)
        for key, value in data.items():
            setattr(report, key, value)
        return report

    monkeypatch.setattr(ReportRepository, "create", staticmethod(fake_create))
    monkeypatch.setattr(AdminRepository, "create_review_case_if_absent", staticmethod(lambda data: None))
    monkeypatch.setattr(
        report_service_module.db,
        "session",
        SimpleNamespace(
            flush=lambda: None,
            commit=lambda: None,
            rollback=lambda: None,
        ),
    )

    ReportService.create_report(
        {
            "reporter_member_id": 1,
            "hospital_id": 1,
            "report_type": "other",
            "status": "resolved",
            "admin_member_id": 9,
            "admin_memo": "임의 처리",
            "resolved_at": "2026-07-05T00:00:00+09:00",
        }
    )

    assert captured["status"] == "pending"
    assert "admin_member_id" not in captured
    assert "admin_memo" not in captured
    assert "resolved_at" not in captured


def test_report_management_requires_admin(app, client, monkeypatch):
    monkeypatch.setattr(ReportService, "list_reports", staticmethod(lambda **kwargs: []))

    user_response = client.get("/api/reports/", headers=auth_header(app, 1))
    admin_response = client.get("/api/reports/", headers=auth_header(app, 9))

    assert user_response.status_code == 403
    assert admin_response.status_code == 200


@pytest.mark.parametrize(
    ("method", "url"),
    [
        ("patch", "/api/hospitals/1"),
        ("get", "/api/reports/1"),
        ("patch", "/api/reports/1"),
        ("post", "/api/reports/1/resolve"),
        ("patch", "/api/analysis/requests/1/status"),
    ],
)
def test_admin_only_routes_reject_normal_user(app, client, method, url):
    response = client.open(
        url,
        method=method.upper(),
        json={},
        headers=auth_header(app, 1),
    )

    assert response.status_code == 403


def test_analysis_request_detail_rejects_other_member(app, client, monkeypatch):
    monkeypatch.setattr(
        AnalysisService,
        "get_request",
        staticmethod(lambda request_id: {"id": request_id, "member_id": 2}),
    )

    response = client.get("/api/analysis/requests/7", headers=auth_header(app, 1))

    assert response.status_code == 403


def test_analysis_request_list_is_scoped_to_current_member(app, client, monkeypatch):
    captured = {}

    def fake_list_requests(**kwargs):
        captured.update(kwargs)
        return []

    monkeypatch.setattr(AnalysisService, "list_requests", staticmethod(fake_list_requests))

    response = client.get("/api/analysis/requests?hospital_id=8", headers=auth_header(app, 1))

    assert response.status_code == 200
    assert captured["member_id"] == 1
    assert captured["hospital_id"] == 8


def test_analysis_request_create_uses_current_member(app, client, monkeypatch):
    captured = {}

    def fake_create_request(payload):
        captured.update(payload)
        return {"id": 10, **payload}

    monkeypatch.setattr(AnalysisService, "create_request", staticmethod(fake_create_request))

    response = client.post(
        "/api/analysis/requests",
        json={"member_id": 2, "hospital_id": 8},
        headers=auth_header(app, 1),
    )

    assert response.status_code == 201
    assert captured["member_id"] == 1


def test_analysis_request_result_rejects_other_member(app, client, monkeypatch):
    monkeypatch.setattr(
        AnalysisService,
        "get_request",
        staticmethod(lambda request_id: {"id": request_id, "member_id": 2}),
    )

    response = client.get("/api/analysis/requests/7/result", headers=auth_header(app, 1))

    assert response.status_code == 403


def test_analysis_result_detail_rejects_other_member(app, client, monkeypatch):
    monkeypatch.setattr(
        AnalysisService,
        "get_result",
        staticmethod(lambda result_id: {"id": result_id, "member_id": 2}),
    )

    response = client.get("/api/analysis/results/7", headers=auth_header(app, 1))

    assert response.status_code == 403


def test_analysis_result_create_requires_admin(app, client, monkeypatch):
    monkeypatch.setattr(AnalysisService, "create_result", staticmethod(lambda payload: {"id": 5, **payload}))

    user_response = client.post(
        "/api/analysis/results",
        json={"member_id": 1, "hospital_id": 2, "total_score": 80},
        headers=auth_header(app, 1),
    )
    admin_response = client.post(
        "/api/analysis/results",
        json={"member_id": 1, "hospital_id": 2, "total_score": 80},
        headers=auth_header(app, 9),
    )

    assert user_response.status_code == 403
    assert admin_response.status_code == 201
