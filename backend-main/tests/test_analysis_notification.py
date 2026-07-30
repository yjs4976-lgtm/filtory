from types import SimpleNamespace

import app.services.analysis_service as analysis_service_module
from app.clients.ai_review_analysis_client import AIReviewAnalysisClient
from app.repositories import AnalysisRepository, ReviewRepository
from app.services.analysis_service import AnalysisService
from app.services.hospital_service import HospitalService
from app.services.notification_service import NotificationService


def test_analyze_reviews_creates_completion_notification(monkeypatch):
    session = SimpleNamespace(flush_count=0, commit_count=0, rolled_back=False)
    notifications = []
    reviews = []
    request = SimpleNamespace(
        id=11,
        member_id=3,
        request_status="pending",
        started_at=None,
        completed_at=None,
        error_message=None,
    )
    result = SimpleNamespace(id=22, total_score=88)
    hospital = SimpleNamespace(
        id=5,
        hospital_name="테스트피부과",
        category="dermatology",
        address=None,
        road_address=None,
        phone=None,
        homepage_url=None,
        source_provider=None,
        external_place_id=None,
        kakao_place_url=None,
        latitude=None,
        longitude=None,
        description=None,
        has_photos=None,
        naver_place_url=None,
        naver_place_id=None,
        google_map_url=None,
        google_place_id=None,
        google_registered=None,
        english_name=None,
        has_english_info=None,
        has_english_reviews=None,
        has_google_photos=None,
    )

    def flush():
        session.flush_count += 1

    def commit():
        session.commit_count += 1

    def rollback():
        session.rolled_back = True

    session.flush = flush
    session.commit = commit
    session.rollback = rollback

    def create_review(data):
        review = SimpleNamespace(id=len(reviews) + 1, **data)
        reviews.append(review)
        return review

    monkeypatch.setattr(analysis_service_module.db, "session", session)
    monkeypatch.setattr(HospitalService, "get_or_create_hospital_for_analysis", staticmethod(lambda data: hospital))
    monkeypatch.setattr(AnalysisService, "_create_enrichment_suggestion", staticmethod(lambda *args, **kwargs: None))
    monkeypatch.setattr(AnalysisService, "_create_moderation_cases_for_result", staticmethod(lambda *args, **kwargs: None))
    monkeypatch.setattr(AnalysisRepository, "create_request", staticmethod(lambda data: request))
    monkeypatch.setattr(ReviewRepository, "create", staticmethod(create_review))
    monkeypatch.setattr(
        AIReviewAnalysisClient,
        "analyze",
        staticmethod(
            lambda payload: {
                "totalScore": 88,
                "trustScore": 80,
                "adScore": 10,
                "placeScore": 70,
                "foreignerScore": 60,
                "trustLevelKey": "safe",
                "adSuspicionLevel": "low",
                "repetitionLevel": "low",
                "summary": "분석 완료",
                "evidence": {},
                "modelVersion": "test",
            }
        ),
    )
    monkeypatch.setattr(AnalysisRepository, "create_result", staticmethod(lambda data: result))
    monkeypatch.setattr(
        NotificationService,
        "create_analysis_completed_notification",
        staticmethod(lambda *args: notifications.append(args)),
    )

    AnalysisService.analyze_reviews(
        3,
        {
            "category": "dermatology",
            "hospitalName": "테스트피부과",
            "reviews": ["상담이 자세했어요."],
        },
    )

    assert notifications == [(3, "테스트피부과", 11, 22, 88)]
    assert request.request_status == "success"
    assert session.commit_count == 2
    assert session.rolled_back is False


def test_enrichment_suggestion_failure_does_not_block_analysis(monkeypatch):
    session = SimpleNamespace(rolled_back=False, committed=False)
    session.commit = lambda: setattr(session, "committed", True)
    session.rollback = lambda: setattr(session, "rolled_back", True)

    def fail_create(*args, **kwargs):
        raise RuntimeError("missing optional table")

    monkeypatch.setattr(analysis_service_module.db, "session", session)
    monkeypatch.setattr(AnalysisService, "_create_enrichment_suggestion", staticmethod(fail_create))

    AnalysisService._try_create_enrichment_suggestion(
        {"english_name": "Example Clinic"},
        hospital_id=1,
        analysis_request_id=2,
        member_id=3,
    )

    assert session.rolled_back is True
    assert session.committed is False


def test_ai_review_analysis_client_sends_internal_token_header(monkeypatch):
    captured_headers = {}

    class FakeResponse:
        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, traceback):
            return False

        def read(self):
            return b'{"totalScore":80,"trustScore":75}'

    def fake_urlopen(request, timeout):
        captured_headers.update(request.headers)
        return FakeResponse()

    monkeypatch.setenv("AI_INTERNAL_TOKEN", "secret-token")
    monkeypatch.setattr(AIReviewAnalysisClient, "_api_url", staticmethod(lambda: "http://127.0.0.1:8000/api/reviews/analyze"))
    monkeypatch.setattr(AIReviewAnalysisClient, "_timeout_seconds", staticmethod(lambda: 3))
    monkeypatch.setattr("urllib.request.urlopen", fake_urlopen)

    AIReviewAnalysisClient.analyze({"reviewText": "상담이 자세했어요."})

    assert captured_headers["X-internal-token"] == "secret-token"


def test_ai_review_analysis_client_requires_internal_token(monkeypatch):
    monkeypatch.delenv("AI_INTERNAL_TOKEN", raising=False)
    monkeypatch.setattr(AIReviewAnalysisClient, "_api_url", staticmethod(lambda: "http://127.0.0.1:8000/api/reviews/analyze"))

    try:
        AIReviewAnalysisClient.analyze({"reviewText": "상담이 자세했어요."})
    except RuntimeError as exc:
        assert str(exc) == "AI_INTERNAL_TOKEN is not configured"
    else:
        raise AssertionError("AI_INTERNAL_TOKEN must be required")


def test_ai_review_analysis_client_default_timeout_allows_backend_ai_fallback(monkeypatch):
    monkeypatch.delenv("BACKEND_AI_TIMEOUT_SECONDS", raising=False)

    assert AIReviewAnalysisClient._timeout_seconds() == 30
