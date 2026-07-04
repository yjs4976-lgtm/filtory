from types import SimpleNamespace

import pytest

import app.services.inquiry_service as inquiry_service_module
from app.repositories import InquiryRepository
from app.services.inquiry_service import InquiryService


def test_list_my_inquiries_returns_items_and_total(monkeypatch):
    inquiries = [SimpleNamespace(id=1), SimpleNamespace(id=2)]

    monkeypatch.setattr(
        InquiryRepository,
        "list_by_member",
        staticmethod(lambda member_id, limit=20, offset=0: (inquiries, 27)),
    )
    monkeypatch.setattr(
        inquiry_service_module,
        "inquiry_to_dict",
        lambda inquiry: {"id": inquiry.id},
    )

    items, total = InquiryService.list_my_inquiries(1, limit=20, offset=0)

    assert items == [{"id": 1}, {"id": 2}]
    assert total == 27


def test_inquiry_data_rejects_attachment_url():
    with pytest.raises(ValueError, match="Attachments are not supported yet"):
        InquiryService._inquiry_data(
            {
                "category": "ANALYSIS_RESULT",
                "title": "분석 결과 문의",
                "content": "분석 결과가 예상과 달라 문의합니다.",
                "attachmentUrl": "https://example.com/phishing",
            },
            member_id=1,
        )


def test_inquiry_data_rejects_overlong_title():
    with pytest.raises(ValueError, match="200"):
        InquiryService._inquiry_data(
            {
                "category": "ANALYSIS_RESULT",
                "title": "가" * 201,
                "content": "분석 결과가 예상과 달라 문의합니다.",
            },
            member_id=1,
        )


def test_cannot_mark_inquiry_answered_without_answer(monkeypatch):
    inquiry = SimpleNamespace(id=1, answers=[])

    monkeypatch.setattr(
        InquiryRepository,
        "get_by_id",
        staticmethod(lambda inquiry_id: inquiry),
    )

    with pytest.raises(ValueError, match="Answer is required"):
        InquiryService.update_status(1, "ANSWERED")


def test_can_mark_inquiry_answered_with_answer(monkeypatch):
    inquiry = SimpleNamespace(id=1, status="IN_PROGRESS", answers=[SimpleNamespace(id=10, created_at=None)])
    session = SimpleNamespace(committed=False, rolled_back=False)

    def commit():
        session.committed = True

    def rollback():
        session.rolled_back = True

    def update(target, data):
        for key, value in data.items():
            setattr(target, key, value)
        return target

    session.commit = commit
    session.rollback = rollback

    monkeypatch.setattr(inquiry_service_module.db, "session", session)
    monkeypatch.setattr(InquiryRepository, "get_by_id", staticmethod(lambda inquiry_id: inquiry))
    monkeypatch.setattr(InquiryRepository, "update", staticmethod(update))
    monkeypatch.setattr(InquiryService, "get_admin_inquiry", staticmethod(lambda inquiry_id: {"id": inquiry_id, "status": inquiry.status}))

    result = InquiryService.update_status(1, "ANSWERED")

    assert result == {"id": 1, "status": "ANSWERED"}
    assert inquiry.status == "ANSWERED"
    assert session.committed is True
    assert session.rolled_back is False


def test_save_answer_marks_inquiry_answered(monkeypatch):
    inquiry = SimpleNamespace(id=1, status="PENDING", answers=[])
    session = SimpleNamespace(committed=False, rolled_back=False)
    created_answers = []
    updates = []

    def commit():
        session.committed = True

    def rollback():
        session.rolled_back = True

    def create_answer(data):
        created_answers.append(data)
        return SimpleNamespace(id=20, created_at=None, **data)

    def update(target, data):
        updates.append(data)
        for key, value in data.items():
            setattr(target, key, value)
        return target

    session.commit = commit
    session.rollback = rollback

    monkeypatch.setattr(inquiry_service_module.db, "session", session)
    monkeypatch.setattr(InquiryRepository, "get_with_context_by_id", staticmethod(lambda inquiry_id: inquiry))
    monkeypatch.setattr(InquiryRepository, "create_answer", staticmethod(create_answer))
    monkeypatch.setattr(InquiryRepository, "update", staticmethod(update))
    monkeypatch.setattr(InquiryService, "get_admin_inquiry", staticmethod(lambda inquiry_id: {"id": inquiry_id, "status": inquiry.status}))

    result = InquiryService.save_answer(1, admin_id=9, content="답변입니다")

    assert created_answers == [
        {
            "inquiry_id": 1,
            "admin_id": 9,
            "content": "답변입니다",
        }
    ]
    assert {"status": "ANSWERED"} in updates
    assert result == {"id": 1, "status": "ANSWERED"}
    assert session.committed is True
    assert session.rolled_back is False
