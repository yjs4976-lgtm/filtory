from uuid import uuid4

from flask import current_app
from werkzeug.utils import secure_filename

from app.clients.supabase_storage_client import SupabaseStorageClient
from app.extensions import db
from app.repositories import AnalysisRepository, InquiryRepository
from app.schemas import inquiry_to_dict


class InquiryService:
    MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024
    ALLOWED_ATTACHMENT_TYPES = {
        "jpg": {"image/jpeg"},
        "jpeg": {"image/jpeg"},
        "png": {"image/png"},
        "webp": {"image/webp"},
        "pdf": {"application/pdf"},
        "txt": {"text/plain"},
        "csv": {"text/csv", "application/csv", "application/vnd.ms-excel", "text/plain"},
    }
    DEFAULT_ATTACHMENT_CONTENT_TYPES = {
        "jpg": "image/jpeg",
        "jpeg": "image/jpeg",
        "png": "image/png",
        "webp": "image/webp",
        "pdf": "application/pdf",
        "txt": "text/plain",
        "csv": "text/csv",
    }
    CATEGORIES = {
        "ANALYSIS_RESULT",
        "REVIEW_INPUT",
        "ACCOUNT",
        "PAYMENT",
        "SUGGESTION",
        "OTHER",
    }
    STATUSES = {"PENDING", "IN_PROGRESS", "ANSWERED"}

    @staticmethod
    def create_inquiry(member_id, payload, attachment_file=None):
        data = InquiryService._inquiry_data(payload or {}, member_id)
        InquiryService._validate_related_analysis(member_id, data.get("related_analysis_id"))
        uploaded_attachment_path = None
        storage = None

        try:
            inquiry = InquiryRepository.create(data)
            db.session.flush()
            if attachment_file and attachment_file.filename:
                storage = InquiryService._storage_client()
                attachment_data = InquiryService._upload_attachment(
                    storage,
                    member_id,
                    inquiry.id,
                    attachment_file,
                )
                uploaded_attachment_path = attachment_data["attachment_path"]
                InquiryRepository.update(inquiry, attachment_data)
            db.session.commit()
            return inquiry_to_dict(inquiry)
        except Exception:
            db.session.rollback()
            if storage and uploaded_attachment_path:
                storage.delete_object(uploaded_attachment_path)
            raise

    @staticmethod
    def list_my_inquiries(member_id, limit=20, offset=0):
        inquiries, total = InquiryRepository.list_by_member(member_id, limit=limit, offset=offset)
        return [inquiry_to_dict(inquiry) for inquiry in inquiries], total

    @staticmethod
    def get_my_inquiry(member_id, inquiry_id):
        inquiry = InquiryRepository.get_with_context_by_id(inquiry_id)
        if not inquiry or inquiry.member_id != member_id:
            raise ValueError("Inquiry not found")
        return inquiry_to_dict(inquiry)

    @staticmethod
    def list_admin_inquiries(keyword=None, status=None, category=None, limit=20, offset=0):
        normalized_status = InquiryService._normalize_status(status) if status else None
        normalized_category = InquiryService._normalize_category(category) if category else None
        inquiries, total = InquiryRepository.list_for_admin(
            keyword=keyword,
            status=normalized_status,
            category=normalized_category,
            limit=limit,
            offset=offset,
        )
        return [inquiry_to_dict(inquiry, include_member=True) for inquiry in inquiries], total

    @staticmethod
    def get_admin_inquiry(inquiry_id):
        inquiry = InquiryRepository.get_with_context_by_id(inquiry_id)
        if not inquiry:
            raise ValueError("Inquiry not found")
        return inquiry_to_dict(inquiry, include_member=True)

    @staticmethod
    def update_status(inquiry_id, status):
        inquiry = InquiryRepository.get_by_id(inquiry_id)
        if not inquiry:
            raise ValueError("Inquiry not found")

        normalized_status = InquiryService._normalize_status(status)
        if normalized_status == "ANSWERED" and InquiryService._latest_answer(inquiry) is None:
            raise ValueError("Answer is required before marking inquiry as answered")

        try:
            InquiryRepository.update(inquiry, {"status": normalized_status})
            db.session.commit()
            return InquiryService.get_admin_inquiry(inquiry.id)
        except Exception:
            db.session.rollback()
            raise

    @staticmethod
    def save_answer(inquiry_id, admin_id, content):
        inquiry = InquiryRepository.get_with_context_by_id(inquiry_id)
        if not inquiry:
            raise ValueError("Inquiry not found")

        cleaned_content = InquiryService._clean_required_text(content, "Answer content is required", min_length=2)
        latest_answer = InquiryService._latest_answer(inquiry)

        try:
            if latest_answer:
                InquiryRepository.update_answer(
                    latest_answer,
                    {
                        "admin_id": admin_id,
                        "content": cleaned_content,
                    },
                )
            else:
                InquiryRepository.create_answer(
                    {
                        "inquiry_id": inquiry.id,
                        "admin_id": admin_id,
                        "content": cleaned_content,
                    }
                )
            InquiryRepository.update(inquiry, {"status": "ANSWERED"})
            from app.services.notification_service import NotificationService

            NotificationService.create_inquiry_answered_notification(inquiry)
            db.session.commit()
            return InquiryService.get_admin_inquiry(inquiry.id)
        except Exception:
            db.session.rollback()
            raise

    @staticmethod
    def get_attachment_for_member(member, inquiry_id):
        inquiry = InquiryRepository.get_with_context_by_id(inquiry_id)
        if not inquiry or (member.role != "admin" and inquiry.member_id != member.id):
            raise ValueError("Inquiry attachment not found")
        if not inquiry.attachment_path:
            raise ValueError("Inquiry attachment not found")

        content, detected_content_type = InquiryService._storage_client().download_object(inquiry.attachment_path)
        return {
            "content": content,
            "file_name": inquiry.attachment_file_name or "attachment",
            "content_type": inquiry.attachment_content_type or detected_content_type,
        }

    @staticmethod
    def _inquiry_data(payload, member_id):
        category = InquiryService._normalize_category(payload.get("category"))
        title = InquiryService._clean_required_text(
            payload.get("title"),
            "Inquiry title is required",
            min_length=2,
            max_length=200,
        )
        content = InquiryService._clean_required_text(
            payload.get("content"),
            "Inquiry content is required",
            min_length=5,
            max_length=5000,
        )
        related_analysis_id = InquiryService._optional_int(payload.get("relatedAnalysisId") or payload.get("related_analysis_id"))
        sub_category = InquiryService._clean_optional_text(
            payload.get("subCategory") or payload.get("sub_category"),
            max_length=120,
        )
        attachment_url = InquiryService._clean_optional_text(payload.get("attachmentUrl") or payload.get("attachment_url"))
        if attachment_url:
            raise ValueError("External attachment URLs are not allowed")

        return {
            "member_id": member_id,
            "category": category,
            "sub_category": sub_category,
            "title": title,
            "content": content,
            "related_analysis_id": related_analysis_id,
            "attachment_url": None,
        }

    @staticmethod
    def _upload_attachment(storage, member_id, inquiry_id, attachment_file):
        original_name = attachment_file.filename or ""
        extension = original_name.rsplit(".", 1)[-1].lower() if "." in original_name else ""
        safe_name = secure_filename(original_name)
        if extension not in InquiryService.ALLOWED_ATTACHMENT_TYPES:
            raise ValueError("Unsupported attachment file type")

        content_type = attachment_file.mimetype or InquiryService.DEFAULT_ATTACHMENT_CONTENT_TYPES[extension]
        if content_type not in InquiryService.ALLOWED_ATTACHMENT_TYPES[extension]:
            raise ValueError("Unsupported attachment file type")

        content = attachment_file.stream.read(InquiryService.MAX_ATTACHMENT_SIZE + 1)
        if not content:
            raise ValueError("Attachment file is required")
        if len(content) > InquiryService.MAX_ATTACHMENT_SIZE:
            raise ValueError("Attachment file must be 5 MB or smaller")

        file_name = safe_name if safe_name and "." in safe_name else f"attachment.{extension}"
        object_path = f"members/{member_id}/inquiries/{inquiry_id}/{uuid4().hex}.{extension}"
        storage.upload_object(object_path, content, content_type)
        return {
            "attachment_path": object_path,
            "attachment_file_name": file_name,
            "attachment_content_type": content_type,
            "attachment_size": len(content),
        }

    @staticmethod
    def _storage_client():
        return SupabaseStorageClient(
            current_app.config.get("SUPABASE_URL"),
            current_app.config.get("SUPABASE_STORAGE_KEY")
            or current_app.config.get("SUPABASE_SERVICE_ROLE_KEY")
            or current_app.config.get("SUPABASE_SECRET_KEY"),
            current_app.config.get("SUPABASE_INQUIRY_ATTACHMENT_BUCKET", "inquiry-attachments"),
        )

    @staticmethod
    def _validate_related_analysis(member_id, related_analysis_id):
        if related_analysis_id is None:
            return

        analysis_request = AnalysisRepository.get_request_by_id(related_analysis_id)
        if not analysis_request or analysis_request.member_id != member_id:
            raise ValueError("Related analysis not found")

    @staticmethod
    def _normalize_category(category):
        normalized = str(category or "").strip().upper()
        if normalized not in InquiryService.CATEGORIES:
            raise ValueError("Invalid inquiry category")
        return normalized

    @staticmethod
    def _normalize_status(status):
        normalized = str(status or "").strip().upper()
        if normalized not in InquiryService.STATUSES:
            raise ValueError("Invalid inquiry status")
        return normalized

    @staticmethod
    def _clean_required_text(value, message, min_length=1, max_length=None):
        cleaned = str(value or "").strip()
        if len(cleaned) < min_length:
            raise ValueError(message)
        if max_length is not None and len(cleaned) > max_length:
            raise ValueError(f"Text must be {max_length} characters or less")
        return cleaned

    @staticmethod
    def _clean_optional_text(value, max_length=None):
        cleaned = str(value or "").strip()
        if max_length is not None and len(cleaned) > max_length:
            raise ValueError(f"Text must be {max_length} characters or less")
        return cleaned or None

    @staticmethod
    def _optional_int(value):
        if value in (None, ""):
            return None
        try:
            number = int(value)
        except (TypeError, ValueError) as exc:
            raise ValueError("Invalid related analysis") from exc
        if number <= 0:
            raise ValueError("Invalid related analysis")
        return number

    @staticmethod
    def _latest_answer(inquiry):
        answers = list(inquiry.answers or [])
        if not answers:
            return None
        return sorted(answers, key=lambda answer: (answer.created_at is not None, answer.created_at, answer.id), reverse=True)[0]
