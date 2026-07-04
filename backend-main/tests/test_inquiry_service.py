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
