from types import SimpleNamespace

import pytest

import app.services.notification_service as notification_service_module
from app.repositories import NotificationRepository
from app.services.notification_service import NotificationService


def test_list_notifications_uses_current_member(monkeypatch):
    calls = []
    notifications = [SimpleNamespace(id=1, notification_type="analysis")]

    monkeypatch.setattr(
        NotificationRepository,
        "list_by_member",
        staticmethod(lambda member_id, limit=20, offset=0: (calls.append((member_id, limit, offset)) or (notifications, 9))),
    )
    monkeypatch.setattr(
        notification_service_module,
        "notification_to_dict",
        lambda notification: {"id": notification.id},
    )

    items, total = NotificationService.list_my_notifications(7, limit=5, offset=10)

    assert calls == [(7, 5, 10)]
    assert items == [{"id": 1}]
    assert total == 9


def test_mark_other_member_notification_as_read_is_rejected(monkeypatch):
    notification = SimpleNamespace(id=1, member_id=2, is_read=False)

    monkeypatch.setattr(NotificationRepository, "get_by_id", staticmethod(lambda notification_id: notification))

    with pytest.raises(ValueError, match="not found"):
        NotificationService.mark_as_read(member_id=1, notification_id=1)


def test_mark_all_as_read_uses_current_member(monkeypatch):
    session = SimpleNamespace(committed=False, rolled_back=False)
    calls = []

    def commit():
        session.committed = True

    def rollback():
        session.rolled_back = True

    session.commit = commit
    session.rollback = rollback

    monkeypatch.setattr(notification_service_module.db, "session", session)
    monkeypatch.setattr(
        NotificationRepository,
        "mark_all_as_read",
        staticmethod(lambda member_id: calls.append(member_id) or 3),
    )

    result = NotificationService.mark_all_as_read(8)

    assert calls == [8]
    assert result == {"updatedCount": 3}
    assert session.committed is True
    assert session.rolled_back is False


def test_create_analysis_completed_notification_payload(monkeypatch):
    created = []

    monkeypatch.setattr(NotificationRepository, "create", staticmethod(lambda data: created.append(data) or SimpleNamespace(**data)))

    NotificationService.create_analysis_completed_notification(
        member_id=4,
        hospital_name="테스트피부과",
        analysis_request_id=11,
        analysis_result_id=22,
        total_score=87,
    )

    assert created == [
        {
            "member_id": 4,
            "notification_type": "analysis",
            "title": "분석 결과가 준비됐어요",
            "message": "테스트피부과 리뷰 분석이 완료됐습니다. 주요 점수 87점으로 저장됐어요.",
            "link_url": "/history",
            "metadata_json": {
                "analysisRequestId": 11,
                "analysisResultId": 22,
                "totalScore": 87,
            },
        }
    ]
