from datetime import datetime, timezone

from app.extensions import db
from app.repositories import ContentRepository


class ContentService:
    """공지사항·FAQ의 공개 범위와 관리자 변경 규칙을 관리한다.

    공개 API에는 게시 가능한 콘텐츠만 노출하고, 관리자 저장 시에는 허용 필드와
    게시 상태를 검증한다. 수정 시각은 애플리케이션에서 명시적으로 갱신한다.
    """

    STATUSES = {"DRAFT", "PUBLISHED", "ARCHIVED"}

    @staticmethod
    def list_admin_notices(keyword=None, status=None, pinned=None, limit=20, offset=0):
        normalized_status = ContentService._status(status, optional=True)
        normalized_pinned = ContentService._optional_bool(pinned)
        rows, total = ContentRepository.list_notices(
            keyword=keyword, status=normalized_status, pinned=normalized_pinned, limit=limit, offset=offset
        )
        return [ContentService.notice_to_dict(row, include_content=False, include_admin=True) for row in rows], total

    @staticmethod
    def get_admin_notice(notice_id):
        item = ContentRepository.get_notice(notice_id)
        if not item:
            raise LookupError("Notice not found")
        return ContentService.notice_to_dict(item, include_content=True, include_admin=True)

    @staticmethod
    def save_notice(payload, admin_id, notice_id=None):
        item = ContentRepository.get_notice(notice_id) if notice_id else None
        if notice_id and not item:
            raise LookupError("Notice not found")
        data = ContentService._notice_data(payload, partial=bool(item))
        if data.get("status") == "PUBLISHED" and not (item and item.published_at):
            data["published_at"] = datetime.now(timezone.utc)
        data["updated_by"] = admin_id
        data["updated_at"] = datetime.now(timezone.utc)
        if item:
            for key, value in data.items():
                setattr(item, key, value)
        else:
            data["created_by"] = admin_id
            item = ContentRepository.create_notice(data)
        try:
            db.session.commit()
        except Exception:
            db.session.rollback()
            raise
        return ContentService.notice_to_dict(item, include_content=True, include_admin=True)

    @staticmethod
    def list_public_notices(limit=20, offset=0):
        rows, total = ContentRepository.list_notices(published_only=True, limit=limit, offset=offset)
        return [ContentService.notice_to_dict(row, include_content=False, include_admin=False) for row in rows], total

    @staticmethod
    def get_public_notice(notice_id):
        item = ContentRepository.get_notice(notice_id, published_only=True)
        if not item:
            raise LookupError("Notice not found")
        return ContentService.notice_to_dict(item, include_content=True, include_admin=False)

    @staticmethod
    def list_admin_faqs(keyword=None, status=None, category=None, limit=20, offset=0):
        normalized_status = ContentService._status(status, optional=True)
        rows, total = ContentRepository.list_faqs(
            keyword=keyword, status=normalized_status, category=category, limit=limit, offset=offset
        )
        return [ContentService.faq_to_dict(row, include_answer=False) for row in rows], total

    @staticmethod
    def get_admin_faq(faq_id):
        item = ContentRepository.get_faq(faq_id)
        if not item:
            raise LookupError("FAQ not found")
        return ContentService.faq_to_dict(item, include_answer=True)

    @staticmethod
    def save_faq(payload, admin_id, faq_id=None):
        item = ContentRepository.get_faq(faq_id) if faq_id else None
        if faq_id and not item:
            raise LookupError("FAQ not found")
        data = ContentService._faq_data(payload, partial=bool(item))
        if data.get("status") == "PUBLISHED" and not (item and item.published_at):
            data["published_at"] = datetime.now(timezone.utc)
        data["updated_by"] = admin_id
        data["updated_at"] = datetime.now(timezone.utc)
        if item:
            for key, value in data.items():
                setattr(item, key, value)
        else:
            data["created_by"] = admin_id
            item = ContentRepository.create_faq(data)
        try:
            db.session.commit()
        except Exception:
            db.session.rollback()
            raise
        return ContentService.faq_to_dict(item, include_answer=True)

    @staticmethod
    def notice_to_dict(item, include_content, include_admin):
        data = {
            "id": item.id, "title": item.title, "status": item.status, "pinned": bool(item.pinned),
            "publishedAt": ContentService._date(item.published_at),
            "createdAt": ContentService._date(item.created_at),
            "updatedAt": ContentService._date(item.updated_at),
        }
        if include_content:
            data["content"] = item.content
        if include_admin:
            data.update({"createdBy": item.created_by, "updatedBy": item.updated_by})
        else:
            data.pop("status", None)
            data.pop("createdAt", None)
            data.pop("updatedAt", None)
        return data

    @staticmethod
    def faq_to_dict(item, include_answer):
        data = {
            "id": item.id, "category": item.category, "question": item.question, "status": item.status,
            "sortOrder": item.sort_order, "publishedAt": ContentService._date(item.published_at),
            "createdAt": ContentService._date(item.created_at), "updatedAt": ContentService._date(item.updated_at),
        }
        if include_answer:
            data["answer"] = item.answer
        return data

    @staticmethod
    def _notice_data(payload, partial=False):
        data = {}
        if not partial or "title" in payload:
            data["title"] = ContentService._text(payload.get("title"), "title", 200)
        if not partial or "content" in payload:
            data["content"] = ContentService._text(payload.get("content"), "content")
        if not partial or "status" in payload:
            data["status"] = ContentService._status(payload.get("status") or "DRAFT")
        if not partial or "pinned" in payload:
            if not isinstance(payload.get("pinned", False), bool):
                raise ValueError("pinned must be a boolean")
            data["pinned"] = payload.get("pinned", False)
        return data

    @staticmethod
    def _faq_data(payload, partial=False):
        data = {}
        if not partial or "question" in payload:
            data["question"] = ContentService._text(payload.get("question"), "question", 300)
        if not partial or "answer" in payload:
            data["answer"] = ContentService._text(payload.get("answer"), "answer")
        if not partial or "category" in payload:
            data["category"] = ContentService._text(payload.get("category") or "GENERAL", "category", 50)
        if not partial or "status" in payload:
            data["status"] = ContentService._status(payload.get("status") or "DRAFT")
        if not partial or "sortOrder" in payload:
            try:
                value = int(payload.get("sortOrder", 0))
            except (TypeError, ValueError):
                raise ValueError("sortOrder must be zero or greater")
            if value < 0:
                raise ValueError("sortOrder must be zero or greater")
            data["sort_order"] = value
        return data

    @staticmethod
    def _status(value, optional=False):
        if optional and (value is None or str(value).lower() == "all"):
            return None
        status = str(value or "").upper()
        if status not in ContentService.STATUSES:
            raise ValueError("Invalid content status")
        return status

    @staticmethod
    def _optional_bool(value):
        if value is None or str(value).lower() == "all":
            return None
        if isinstance(value, bool):
            return value
        if str(value).lower() in {"true", "1"}:
            return True
        if str(value).lower() in {"false", "0"}:
            return False
        raise ValueError("Invalid pinned filter")

    @staticmethod
    def _text(value, name, max_length=None):
        text = str(value or "").strip()
        if not text:
            raise ValueError(f"{name} is required")
        if max_length and len(text) > max_length:
            raise ValueError(f"{name} must be {max_length} characters or fewer")
        return text

    @staticmethod
    def _date(value):
        return value.isoformat() if value else None
