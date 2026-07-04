from app.extensions import db
from app.repositories import AnalysisRepository, InquiryRepository
from app.schemas import inquiry_to_dict


class InquiryService:
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
    def create_inquiry(member_id, payload):
        data = InquiryService._inquiry_data(payload or {}, member_id)
        InquiryService._validate_related_analysis(member_id, data.get("related_analysis_id"))

        try:
            inquiry = InquiryRepository.create(data)
            db.session.commit()
            return inquiry_to_dict(inquiry)
        except Exception:
            db.session.rollback()
            raise

    @staticmethod
    def list_my_inquiries(member_id, limit=20, offset=0):
        inquiries = InquiryRepository.list_by_member(member_id, limit=limit, offset=offset)
        return [inquiry_to_dict(inquiry) for inquiry in inquiries]

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
            db.session.commit()
            return InquiryService.get_admin_inquiry(inquiry.id)
        except Exception:
            db.session.rollback()
            raise

    @staticmethod
    def _inquiry_data(payload, member_id):
        category = InquiryService._normalize_category(payload.get("category"))
        title = InquiryService._clean_required_text(payload.get("title"), "Inquiry title is required", min_length=2)
        content = InquiryService._clean_required_text(payload.get("content"), "Inquiry content is required", min_length=5)
        related_analysis_id = InquiryService._optional_int(payload.get("relatedAnalysisId") or payload.get("related_analysis_id"))

        return {
            "member_id": member_id,
            "category": category,
            "sub_category": InquiryService._clean_optional_text(payload.get("subCategory") or payload.get("sub_category")),
            "title": title,
            "content": content,
            "related_analysis_id": related_analysis_id,
            "attachment_url": InquiryService._clean_optional_text(payload.get("attachmentUrl") or payload.get("attachment_url")),
        }

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
    def _clean_required_text(value, message, min_length=1):
        cleaned = str(value or "").strip()
        if len(cleaned) < min_length:
            raise ValueError(message)
        return cleaned

    @staticmethod
    def _clean_optional_text(value):
        cleaned = str(value or "").strip()
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
