from types import SimpleNamespace

import pytest
from flask import Flask
from flask_jwt_extended import JWTManager, create_access_token

from app.api.admin_api import admin_bp
from app.repositories import AdminRepository
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
        10: SimpleNamespace(id=10, role="user", active=True, deleted_at=None),
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


def user_auth_header(app):
    with app.app_context():
        token = create_access_token(identity="10")
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.parametrize("path", ["/api/admin/analyses", "/api/admin/errors", "/api/admin/usage", "/api/admin/audit-logs"])
def test_new_admin_read_apis_require_login(client, path):
    assert client.get(path).status_code == 401


@pytest.mark.parametrize("path", ["/api/admin/analyses", "/api/admin/errors", "/api/admin/usage", "/api/admin/audit-logs"])
def test_new_admin_read_apis_reject_regular_users(app, client, path):
    assert client.get(path, headers=user_auth_header(app)).status_code == 403


def test_admin_analyses_forwards_filters_and_pagination(app, client, monkeypatch):
    def fake_list_analyses(**kwargs):
        assert kwargs == {
            "keyword": "sample",
            "status": "success",
            "category": "dermatology",
            "analysis_type": "full",
            "limit": 10,
            "offset": 10,
        }
        return ([{"requestId": 21, "status": "success"}], 31)

    monkeypatch.setattr(AdminService, "list_analyses", staticmethod(fake_list_analyses))
    response = client.get(
        "/api/admin/analyses?q=sample&status=success&category=dermatology&analysisType=full&page=2&per_page=10",
        headers=auth_header(app),
    )
    body = response.get_json()

    assert response.status_code == 200
    assert body["data"][0]["requestId"] == 21
    assert body["meta"] == {"page": 2, "per_page": 10, "count": 31}


def test_admin_errors_returns_failed_analysis_summary(app, client, monkeypatch):
    def fake_list_errors(**kwargs):
        assert kwargs["keyword"] == "timeout"
        assert kwargs["category"] == "dentistry"
        assert kwargs["analysis_type"] == "multi_review"
        return (
            [
                {
                    "requestId": 7,
                    "status": "failed",
                    "errorMessage": "AI timeout",
                    "retryAvailable": False,
                }
            ],
            1,
        )

    monkeypatch.setattr(AdminService, "list_errors", staticmethod(fake_list_errors))
    response = client.get(
        "/api/admin/errors?q=timeout&category=dentistry&analysisType=multi_review",
        headers=auth_header(app),
    )
    body = response.get_json()

    assert response.status_code == 200
    assert body["data"][0]["status"] == "failed"
    assert body["data"][0]["errorMessage"] == "AI timeout"
    assert body["data"][0]["retryAvailable"] is False


@pytest.mark.parametrize(
    ("path", "service_method"),
    [
        ("/api/admin/analyses?category=orthopedics", "list_analyses"),
        ("/api/admin/errors?category=orthopedics", "list_errors"),
    ],
)
def test_admin_analysis_endpoints_forward_orthopedics_category(app, client, monkeypatch, path, service_method):
    captured = {}

    def fake_loader(**kwargs):
        captured.update(kwargs)
        return ([], 0)

    monkeypatch.setattr(AdminService, service_method, staticmethod(fake_loader))

    response = client.get(path, headers=auth_header(app))

    assert response.status_code == 200
    assert captured["category"] == "orthopedics"


def test_admin_service_accepts_orthopedics_category(monkeypatch):
    captured = {}

    def fake_list_analyses(**kwargs):
        captured.update(kwargs)
        return ([], 0)

    monkeypatch.setattr(AdminRepository, "list_analyses", staticmethod(fake_list_analyses))

    assert AdminService.list_analyses(category="orthopedics") == ([], 0)
    assert captured["category"] == "orthopedics"


def test_admin_usage_forwards_usage_filters(app, client, monkeypatch):
    def fake_list_usage_logs(**kwargs):
        assert kwargs["keyword"] == "sample@example.com"
        assert kwargs["usage_type"] == "FREE_BASE"
        assert kwargs["period_key"] == "2026-07"
        return (
            [
                {
                    "id": 3,
                    "usageType": "FREE_BASE",
                    "periodKey": "2026-07",
                    "member": {"id": 1, "email": "sample@example.com", "nickname": "SampleUser"},
                    "analysisResultId": 4,
                    "hospital": {"id": 5, "hospitalName": "샘플의원", "category": "dermatology"},
                }
            ],
            1,
        )

    monkeypatch.setattr(AdminService, "list_usage_logs", staticmethod(fake_list_usage_logs))
    response = client.get(
        "/api/admin/usage?q=sample%40example.com&usageType=FREE_BASE&periodKey=2026-07",
        headers=auth_header(app),
    )
    body = response.get_json()

    assert response.status_code == 200
    assert body["data"][0]["member"]["nickname"] == "SampleUser"
    assert body["data"][0]["hospital"]["hospitalName"] == "샘플의원"


def test_admin_summary_keeps_member_counts_and_adds_operations(app, client, monkeypatch):
    summary = {
        "totalUsers": 10,
        "activeUsers": 8,
        "suspendedUsers": 1,
        "withdrawnUsers": 1,
        "totalAnalyses": 20,
        "todayAnalyses": 2,
        "monthAnalyses": 11,
        "failedAnalyses": 3,
        "pendingReviewCases": 4,
        "openInquiries": 5,
        "totalHospitals": 6,
        "needsReviewHospitals": 1,
    }
    monkeypatch.setattr(AdminService, "get_summary", staticmethod(lambda: summary))

    response = client.get("/api/admin/summary", headers=auth_header(app))
    body = response.get_json()

    assert response.status_code == 200
    assert body["data"] == summary


def test_admin_audit_logs_forwards_filters_and_pagination(app, client, monkeypatch):
    def fake_list_audit_logs(**kwargs):
        assert kwargs == {
            "keyword": "SampleAdmin",
            "action": "member_update",
            "resource_type": "members",
            "admin_id": "9",
            "limit": 10,
            "offset": 10,
        }
        return ([{"id": 11, "action": "member_update"}], 21)

    monkeypatch.setattr(AdminService, "list_audit_logs", staticmethod(fake_list_audit_logs))
    response = client.get(
        "/api/admin/audit-logs?q=SampleAdmin&action=member_update&resourceType=members&adminId=9&page=2&per_page=10",
        headers=auth_header(app),
    )
    body = response.get_json()

    assert response.status_code == 200
    assert body["data"][0]["action"] == "member_update"
    assert body["meta"] == {"page": 2, "per_page": 10, "count": 21}


def test_audit_log_metadata_masks_sensitive_keys(monkeypatch):
    audit_log = SimpleNamespace(
        id=11,
        admin_member_id=9,
        admin_member=SimpleNamespace(id=9, email="admin@example.com", nickname="SampleAdmin"),
        action_type="member_update",
        target_table="members",
        target_id=2,
        description="회원 상태 변경",
        request_ip="127.0.0.1",
        before_json={"status": "active", "accessToken": "secret-value", "nested": {"password_hash": "hash"}},
        after_json={"status": "suspended", "cookie": "session-value", "note": "safe"},
        created_at=None,
    )
    monkeypatch.setattr(
        AdminRepository,
        "list_audit_logs",
        staticmethod(lambda **kwargs: ([audit_log], 1)),
    )

    items, total = AdminService.list_audit_logs(
        keyword="SampleAdmin",
        action="member_update",
        resource_type="members",
        admin_id="9",
    )

    assert total == 1
    assert items[0]["admin"]["nickname"] == "SampleAdmin"
    assert items[0]["targetMemberId"] == 2
    assert items[0]["metadataSummary"]["before"]["accessToken"] == "[REDACTED]"
    assert items[0]["metadataSummary"]["before"]["nested"]["password_hash"] == "[REDACTED]"
    assert items[0]["metadataSummary"]["after"]["cookie"] == "[REDACTED]"
    assert "userAgent" not in items[0]


def test_analysis_service_returns_member_hospital_and_score_summary(monkeypatch):
    result = SimpleNamespace(
        id=31,
        total_score=74,
        trust_score=74,
        ad_score=28,
        place_score=60,
        foreigner_score=40,
        trust_level="safe",
        ad_suspicion="low",
    )
    analysis_request = SimpleNamespace(
        id=21,
        member=SimpleNamespace(id=2, email="sample@example.com", nickname="SampleUser"),
        hospital=SimpleNamespace(
            id=5,
            hospital_name="샘플의원",
            category="dermatology",
            region="서울",
            road_address="샘플로 1",
            address=None,
        ),
        analysis_result=result,
        analysis_type="full",
        review_count=10,
        request_status="success",
        error_message=None,
        started_at=None,
        completed_at=None,
        created_at=None,
    )
    monkeypatch.setattr(
        AdminRepository,
        "list_analyses",
        staticmethod(lambda **kwargs: ([analysis_request], 1)),
    )

    items, total = AdminService.list_analyses(status="success", category="dermatology", analysis_type="full")

    assert total == 1
    assert items[0]["member"]["nickname"] == "SampleUser"
    assert items[0]["hospital"]["hospitalName"] == "샘플의원"
    assert items[0]["resultId"] == 31
    assert items[0]["trustScore"] == 74
    assert "reviews" not in items[0]


def test_error_service_forces_failed_or_error_repository_filter(monkeypatch):
    captured = {}

    def fake_list_analyses(**kwargs):
        captured.update(kwargs)
        return ([], 0)

    monkeypatch.setattr(AdminRepository, "list_analyses", staticmethod(fake_list_analyses))

    assert AdminService.list_errors(keyword="timeout") == ([], 0)
    assert captured["errors_only"] is True


def test_usage_service_returns_member_result_and_hospital_summary(monkeypatch):
    result = SimpleNamespace(
        hospital=SimpleNamespace(id=5, hospital_name="샘플의원", category="dermatology"),
        total_score=74,
        trust_score=74,
        ad_score=28,
    )
    usage_log = SimpleNamespace(
        id=3,
        member=SimpleNamespace(id=2, email="sample@example.com", nickname="SampleUser"),
        analysis_result_id=31,
        analysis_result=result,
        usage_type="FREE_BASE",
        period_key="2026-07",
        charged_at=None,
    )
    monkeypatch.setattr(
        AdminRepository,
        "list_usage_logs",
        staticmethod(lambda **kwargs: ([usage_log], 1)),
    )

    items, total = AdminService.list_usage_logs(usage_type="FREE_BASE", period_key="2026-07")

    assert total == 1
    assert items[0]["member"]["email"] == "sample@example.com"
    assert items[0]["analysisResultId"] == 31
    assert items[0]["hospital"]["hospitalName"] == "샘플의원"


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


def test_review_case_dedupe_prefers_user_report_over_analysis_result():
    source = AdminRepository._review_case_dedupe_source(
        {
            "review_id": 7,
            "analysis_result_id": 10,
            "review_report_id": 55,
        }
    )

    assert source == ("review_report_id", 55)


def test_review_case_dedupe_uses_analysis_result_for_automatic_case():
    source = AdminRepository._review_case_dedupe_source(
        {
            "review_id": 7,
            "analysis_result_id": 10,
            "review_report_id": None,
        }
    )

    assert source == ("analysis_result_id", 10)
