from io import BytesIO
from types import SimpleNamespace

import pytest
from werkzeug.datastructures import FileStorage

import app.services.inquiry_service as inquiry_service_module
from app.repositories import InquiryRepository
from app.services.inquiry_service import InquiryService


def make_file(name="proof.png", content=b"file-content", content_type="image/png"):
    return FileStorage(
        stream=BytesIO(content),
        filename=name,
        content_type=content_type,
    )


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
    with pytest.raises(ValueError, match="External attachment URLs are not allowed"):
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


def test_upload_attachment_accepts_allowed_file():
    uploads = []
    storage = SimpleNamespace(
        upload_object=lambda path, content, content_type: uploads.append((path, content, content_type)),
    )

    result = InquiryService._upload_attachment(
        storage,
        member_id=7,
        inquiry_id=11,
        attachment_file=make_file("증빙.png", b"image", "image/png"),
    )

    assert result["attachment_path"].startswith("members/7/inquiries/11/")
    assert result["attachment_path"].endswith(".png")
    assert result["attachment_file_name"] == "attachment.png"
    assert result["attachment_content_type"] == "image/png"
    assert result["attachment_size"] == 5
    assert uploads == [(result["attachment_path"], b"image", "image/png")]


def test_upload_attachment_rejects_oversized_file():
    storage = SimpleNamespace(upload_object=lambda *args: None)
    oversized = b"x" * (InquiryService.MAX_ATTACHMENT_SIZE + 1)

    with pytest.raises(ValueError, match="5 MB"):
        InquiryService._upload_attachment(
            storage,
            member_id=1,
            inquiry_id=1,
            attachment_file=make_file("proof.png", oversized, "image/png"),
        )


def test_upload_attachment_rejects_invalid_extension_and_mime():
    storage = SimpleNamespace(upload_object=lambda *args: None)

    with pytest.raises(ValueError, match="Unsupported"):
        InquiryService._upload_attachment(
            storage,
            member_id=1,
            inquiry_id=1,
            attachment_file=make_file("proof.exe", b"bad", "application/octet-stream"),
        )

    with pytest.raises(ValueError, match="Unsupported"):
        InquiryService._upload_attachment(
            storage,
            member_id=1,
            inquiry_id=1,
            attachment_file=make_file("proof.png", b"bad", "application/pdf"),
        )


def test_owner_and_admin_can_download_attachment(monkeypatch):
    inquiry = SimpleNamespace(
        id=3,
        member_id=1,
        attachment_path="members/1/inquiries/3/file.png",
        attachment_file_name="file.png",
        attachment_content_type="image/png",
    )
    storage = SimpleNamespace(download_object=lambda path: (b"content", "image/png"))

    monkeypatch.setattr(InquiryRepository, "get_with_context_by_id", staticmethod(lambda inquiry_id: inquiry))
    monkeypatch.setattr(InquiryService, "_storage_client", staticmethod(lambda: storage))

    owner_result = InquiryService.get_attachment_for_member(SimpleNamespace(id=1, role="user"), 3)
    admin_result = InquiryService.get_attachment_for_member(SimpleNamespace(id=9, role="admin"), 3)

    assert owner_result["content"] == b"content"
    assert admin_result["content"] == b"content"


def test_other_member_cannot_download_attachment(monkeypatch):
    inquiry = SimpleNamespace(
        id=3,
        member_id=1,
        attachment_path="members/1/inquiries/3/file.png",
    )

    monkeypatch.setattr(InquiryRepository, "get_with_context_by_id", staticmethod(lambda inquiry_id: inquiry))

    with pytest.raises(ValueError, match="not found"):
        InquiryService.get_attachment_for_member(SimpleNamespace(id=2, role="user"), 3)


def test_storage_upload_failure_rolls_back_db(monkeypatch):
    session = SimpleNamespace(committed=False, rolled_back=False, flushed=False)
    inquiry = SimpleNamespace(id=12)

    def flush():
        session.flushed = True

    def commit():
        session.committed = True

    def rollback():
        session.rolled_back = True

    class FailingStorage:
        def upload_object(self, *args):
            raise ValueError("upload failed")

        def delete_object(self, *args):
            raise AssertionError("nothing should be deleted when upload did not finish")

    session.flush = flush
    session.commit = commit
    session.rollback = rollback

    monkeypatch.setattr(inquiry_service_module.db, "session", session)
    monkeypatch.setattr(InquiryService, "_validate_related_analysis", staticmethod(lambda *args: None))
    monkeypatch.setattr(InquiryRepository, "create", staticmethod(lambda data: inquiry))
    monkeypatch.setattr(InquiryService, "_storage_client", staticmethod(lambda: FailingStorage()))

    with pytest.raises(ValueError, match="upload failed"):
        InquiryService.create_inquiry(
            1,
            {
                "category": "ANALYSIS_RESULT",
                "title": "분석 문의",
                "content": "분석 결과가 이상해서 확인 부탁드립니다.",
            },
            attachment_file=make_file(),
        )

    assert session.flushed is True
    assert session.rolled_back is True
    assert session.committed is False


def test_db_save_failure_deletes_uploaded_object(monkeypatch):
    session = SimpleNamespace(rolled_back=False, flushed=False)
    inquiry = SimpleNamespace(id=12)
    deleted_paths = []

    def flush():
        session.flushed = True

    def commit():
        raise RuntimeError("db failed")

    def rollback():
        session.rolled_back = True

    class Storage:
        def upload_object(self, *args):
            return None

        def delete_object(self, path):
            deleted_paths.append(path)

    def update(target, data):
        for key, value in data.items():
            setattr(target, key, value)
        return target

    session.flush = flush
    session.commit = commit
    session.rollback = rollback

    monkeypatch.setattr(inquiry_service_module.db, "session", session)
    monkeypatch.setattr(InquiryService, "_validate_related_analysis", staticmethod(lambda *args: None))
    monkeypatch.setattr(InquiryRepository, "create", staticmethod(lambda data: inquiry))
    monkeypatch.setattr(InquiryRepository, "update", staticmethod(update))
    monkeypatch.setattr(InquiryService, "_storage_client", staticmethod(Storage))

    with pytest.raises(RuntimeError, match="db failed"):
        InquiryService.create_inquiry(
            1,
            {
                "category": "ANALYSIS_RESULT",
                "title": "분석 문의",
                "content": "분석 결과가 이상해서 확인 부탁드립니다.",
            },
            attachment_file=make_file(),
        )

    assert session.rolled_back is True
    assert deleted_paths == [inquiry.attachment_path]


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
    inquiry = SimpleNamespace(id=1, member_id=3, title="문의", status="PENDING", answers=[])
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
    from app.services.notification_service import NotificationService

    monkeypatch.setattr(NotificationService, "create_inquiry_answered_notification", staticmethod(lambda inquiry: None))

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


def test_answer_notification_is_created_only_for_first_answer(monkeypatch):
    session = SimpleNamespace(committed=False, rolled_back=False)
    notifications = []
    created_answers = []
    updates = []

    def commit():
        session.committed = True

    def rollback():
        session.rolled_back = True

    def create_answer(data):
        answer = SimpleNamespace(id=20, created_at=None, **data)
        created_answers.append(answer)
        return answer

    def update(target, data):
        updates.append(data)
        for key, value in data.items():
            setattr(target, key, value)
        return target

    session.commit = commit
    session.rollback = rollback

    first_inquiry = SimpleNamespace(id=1, member_id=3, title="첫 문의", status="PENDING", answers=[])
    existing_answer = SimpleNamespace(id=20, created_at=None, content="기존 답변")
    answered_inquiry = SimpleNamespace(id=1, member_id=3, title="첫 문의", status="ANSWERED", answers=[existing_answer])
    inquiry_sequence = [first_inquiry, answered_inquiry]

    monkeypatch.setattr(inquiry_service_module.db, "session", session)
    monkeypatch.setattr(
        InquiryRepository,
        "get_with_context_by_id",
        staticmethod(lambda inquiry_id: inquiry_sequence.pop(0)),
    )
    monkeypatch.setattr(InquiryRepository, "create_answer", staticmethod(create_answer))
    monkeypatch.setattr(InquiryRepository, "update_answer", staticmethod(update))
    monkeypatch.setattr(InquiryRepository, "update", staticmethod(update))
    monkeypatch.setattr(InquiryService, "get_admin_inquiry", staticmethod(lambda inquiry_id: {"id": inquiry_id, "status": "ANSWERED"}))

    from app.services.notification_service import NotificationService

    monkeypatch.setattr(
        NotificationService,
        "create_inquiry_answered_notification",
        staticmethod(lambda inquiry: notifications.append(inquiry.id)),
    )

    InquiryService.save_answer(1, admin_id=9, content="첫 답변입니다")
    InquiryService.save_answer(1, admin_id=9, content="수정 답변입니다")

    assert len(created_answers) == 1
    assert notifications == [1]
    assert existing_answer.content == "수정 답변입니다"
