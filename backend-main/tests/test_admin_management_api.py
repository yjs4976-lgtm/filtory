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


@pytest.mark.parametrize("path", ["/api/admin/analyses", "/api/admin/errors", "/api/admin/usage", "/api/admin/audit-logs", "/api/admin/settings", "/api/admin/system-status"])
def test_new_admin_read_apis_require_login(client, path):
    assert client.get(path).status_code == 401


@pytest.mark.parametrize("path", ["/api/admin/analyses", "/api/admin/errors", "/api/admin/usage", "/api/admin/audit-logs", "/api/admin/settings", "/api/admin/system-status"])
def test_new_admin_read_apis_reject_regular_users(app, client, path):
    assert client.get(path, headers=user_auth_header(app)).status_code == 403


def test_admin_user_activity_requires_login_and_admin(app, client):
    assert client.get("/api/admin/users/2/activity").status_code == 401
    assert client.get("/api/admin/users/2/activity", headers=user_auth_header(app)).status_code == 403


def test_admin_member_delete_route_is_not_available(app, client):
    response = client.delete("/api/admin/users/2", headers=auth_header(app))

    assert response.status_code == 405


@pytest.mark.parametrize("requested_status", ["ACTIVE", "SUSPENDED"])
def test_admin_member_status_update_keeps_supported_states(app, client, monkeypatch, requested_status):
    def fake_update(member_id, status, admin_member_id):
        assert (member_id, status, admin_member_id) == (2, requested_status, 9)
        return {"id": member_id, "status": requested_status}

    monkeypatch.setattr(AdminService, "update_member_status", staticmethod(fake_update))

    response = client.patch(
        "/api/admin/users/2/status",
        headers=auth_header(app),
        json={"status": requested_status},
    )

    assert response.status_code == 200
    assert response.get_json()["data"]["status"] == requested_status


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


def test_admin_user_activity_returns_readonly_summaries(app, client, monkeypatch):
    payload = {
        "memberId": 2,
        "analysisHistory": [{"requestId": 11, "resultId": 21, "hospitalName": "샘플의원", "status": "success"}],
        "savedHospitals": [{"hospitalId": 3, "hospitalName": "샘플병원", "category": "orthopedics"}],
        "reports": [{"id": 4, "type": "other", "status": "pending", "hospitalName": "샘플의원"}],
        "counts": {"analyses": 1, "savedHospitals": 1, "reports": 1},
    }
    monkeypatch.setattr(AdminService, "get_member_activity", staticmethod(lambda member_id: payload if member_id == 2 else None))

    response = client.get("/api/admin/users/2/activity", headers=auth_header(app))
    body = response.get_json()

    assert response.status_code == 200
    assert body["data"] == payload
    assert "reviewOriginal" not in str(body)


def test_admin_user_activity_returns_404_for_unknown_member(app, client, monkeypatch):
    def raise_not_found(member_id):
        raise ValueError("Member not found")

    monkeypatch.setattr(AdminService, "get_member_activity", staticmethod(raise_not_found))

    assert client.get("/api/admin/users/999/activity", headers=auth_header(app)).status_code == 404


def test_admin_user_activity_supports_empty_history(monkeypatch):
    monkeypatch.setattr(AdminRepository, "get_member_by_id", staticmethod(lambda member_id: SimpleNamespace(id=member_id)))
    monkeypatch.setattr(AdminRepository, "list_member_analysis_activity", staticmethod(lambda member_id: []))
    monkeypatch.setattr(AdminRepository, "list_member_saved_hospital_activity", staticmethod(lambda member_id: []))
    monkeypatch.setattr(AdminRepository, "list_member_report_activity", staticmethod(lambda member_id: []))
    monkeypatch.setattr(
        AdminRepository,
        "get_member_activity_counts",
        staticmethod(lambda member_id: {"analysis_count": 0, "saved_hospital_count": 0, "report_count": 0}),
    )

    assert AdminService.get_member_activity(2) == {
        "memberId": 2,
        "analysisHistory": [],
        "savedHospitals": [],
        "reports": [],
        "counts": {"analyses": 0, "savedHospitals": 0, "reports": 0},
    }


def test_admin_status_normalization_allows_active_and_suspended_only():
    assert AdminService._normalize_mutable_status("ACTIVE") == "active"
    assert AdminService._normalize_mutable_status("SUSPENDED") == "suspended"
    assert AdminService._status_update_data("active")["active"] is True
    assert AdminService._status_update_data("suspended")["active"] is False
    with pytest.raises(ValueError, match="active or suspended"):
        AdminService._normalize_mutable_status("WITHDRAWN")


def test_admin_cannot_change_own_member_role_or_status(monkeypatch):
    monkeypatch.setattr(AdminRepository, "get_member_by_id", staticmethod(lambda member_id: SimpleNamespace(id=member_id)))

    with pytest.raises(ValueError, match="own role or status"):
        AdminService._get_mutable_member(9, 9)


def test_admin_settings_returns_readonly_policy_without_secrets(app, client, monkeypatch):
    payload = {
        "supportedCategories": ["dentistry", "dermatology", "ophthalmology", "orthopedics"],
        "plans": [{"planCode": "free", "planName": "Free", "monthlyPrice": 0, "monthlyAnalysisLimit": 5, "active": True}],
        "usagePolicy": {"freeMonthlyLimit": 5, "plusMockMonthlyLimit": 30, "usageTypes": ["FREE_BASE"], "periodBasis": "UTC_MONTH"},
        "readonly": True,
        "canEdit": False,
    }
    monkeypatch.setattr(AdminService, "get_settings", staticmethod(lambda: payload))

    response = client.get("/api/admin/settings", headers=auth_header(app))
    body = response.get_json()
    serialized = str(body).lower()

    assert response.status_code == 200
    assert "orthopedics" in body["data"]["supportedCategories"]
    assert body["data"]["readonly"] is True
    assert body["data"]["canEdit"] is False
    assert "secret" not in serialized
    assert "token" not in serialized
    assert "database_url" not in serialized


def test_admin_system_status_returns_readonly_counts_without_secrets(app, client, monkeypatch):
    payload = {
        "backendMain": "ok",
        "database": "ok",
        "backendAi": "not_checked",
        "serverTime": "2026-07-28T00:00:00+00:00",
        "totalAnalyses": 20,
        "pendingAnalyses": 2,
        "analyzingAnalyses": 1,
        "failedAnalyses": 3,
        "recentFailedAnalyses": 1,
        "auditLogsToday": 4,
        "openInquiries": 5,
        "readonly": True,
    }
    monkeypatch.setattr(AdminService, "get_system_status", staticmethod(lambda: payload))

    response = client.get("/api/admin/system-status", headers=auth_header(app))
    body = response.get_json()
    serialized = str(body).lower()

    assert response.status_code == 200
    assert body["data"]["database"] == "ok"
    assert body["data"]["serverTime"]
    assert body["data"]["pendingAnalyses"] == 2
    assert body["data"]["analyzingAnalyses"] == 1
    assert body["data"]["failedAnalyses"] == 3
    assert body["data"]["openInquiries"] == 5
    assert "secret" not in serialized
    assert "token" not in serialized
    assert "database_url" not in serialized


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
