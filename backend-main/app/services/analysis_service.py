from datetime import datetime, timezone

from app.extensions import db
from app.repositories import AnalysisRepository, ReviewRepository
from app.schemas import (
    analysis_request_to_dict,
    analysis_result_to_dict,
    extract_analysis_request_data,
    extract_analysis_result_data,
    extract_review_data,
)


class AnalysisService:
    REQUEST_STATUSES = {"pending", "analyzing", "success", "failed", "canceled"}
    ANALYSIS_TYPES = {"single_review", "multi_review", "place_only", "full"}

    @staticmethod
    def list_requests(member_id=None, hospital_id=None, limit=20, offset=0):
        if member_id:
            requests = AnalysisRepository.list_requests_by_member(member_id, limit=limit, offset=offset)
        elif hospital_id:
            requests = AnalysisRepository.list_requests_by_hospital(hospital_id, limit=limit, offset=offset)
        else:
            requests = []

        return [analysis_request_to_dict(analysis_request) for analysis_request in requests]

    @staticmethod
    def get_request(request_id):
        analysis_request = AnalysisRepository.get_request_by_id(request_id)
        if not analysis_request:
            raise ValueError("Analysis request not found")
        return analysis_request_to_dict(analysis_request)

    @staticmethod
    def list_member_history(member_id, limit=20, offset=0):
        analysis_requests = AnalysisRepository.list_history_by_member(
            member_id,
            limit=limit,
            offset=offset,
        )
        return [AnalysisService._history_item_to_dict(analysis_request) for analysis_request in analysis_requests]

    @staticmethod
    def delete_member_history(member_id, request_id):
        analysis_request = AnalysisRepository.get_request_by_id(request_id)
        if not analysis_request or analysis_request.member_id != member_id:
            raise ValueError("Analysis request not found")

        try:
            AnalysisRepository.delete_request(analysis_request)
            db.session.commit()
            return {"id": request_id}
        except Exception:
            db.session.rollback()
            raise

    @staticmethod
    def create_request(payload):
        data = extract_analysis_request_data(payload)
        AnalysisService._validate_request_data(data)
        reviews_payload = payload.get("reviews", [])

        try:
            analysis_request = AnalysisRepository.create_request(data)
            db.session.flush()

            for review_payload in reviews_payload:
                review_data = extract_review_data(review_payload)
                review_data["request_id"] = analysis_request.id
                review_data.setdefault("hospital_id", analysis_request.hospital_id)
                review_data.setdefault("member_id", analysis_request.member_id)
                ReviewRepository.create(review_data)

            if reviews_payload:
                analysis_request.review_count = len(reviews_payload)

            db.session.commit()
            return analysis_request_to_dict(analysis_request)
        except Exception:
            db.session.rollback()
            raise

    @staticmethod
    def update_request_status(request_id, status, error_message=None):
        if status not in AnalysisService.REQUEST_STATUSES:
            raise ValueError("Invalid request status")

        analysis_request = AnalysisRepository.get_request_by_id(request_id)
        if not analysis_request:
            raise ValueError("Analysis request not found")

        data = {
            "request_status": status,
            "error_message": error_message,
        }

        if status == "analyzing":
            data["started_at"] = datetime.now(timezone.utc)

        if status in {"success", "failed", "canceled"}:
            data["completed_at"] = datetime.now(timezone.utc)

        try:
            analysis_request = AnalysisRepository.update_request(analysis_request, data)
            db.session.commit()
            return analysis_request_to_dict(analysis_request)
        except Exception:
            db.session.rollback()
            raise

    @staticmethod
    def create_result(payload):
        data = extract_analysis_result_data(payload)
        AnalysisService._validate_score_data(data)

        try:
            analysis_result = AnalysisRepository.create_result(data)

            if data.get("request_id"):
                analysis_request = AnalysisRepository.get_request_by_id(data["request_id"])
                if analysis_request:
                    analysis_request.request_status = "success"
                    analysis_request.completed_at = datetime.now(timezone.utc)

            db.session.commit()
            return analysis_result_to_dict(analysis_result)
        except Exception:
            db.session.rollback()
            raise

    @staticmethod
    def get_result(result_id):
        analysis_result = AnalysisRepository.get_result_by_id(result_id)
        if not analysis_result:
            raise ValueError("Analysis result not found")
        return analysis_result_to_dict(analysis_result)

    @staticmethod
    def get_result_by_request(request_id):
        analysis_result = AnalysisRepository.get_result_by_request_id(request_id)
        if not analysis_result:
            raise ValueError("Analysis result not found")
        return analysis_result_to_dict(analysis_result)

    @staticmethod
    def _validate_request_data(data):
        if not data.get("hospital_id"):
            raise ValueError("hospital_id is required")

        if data.get("analysis_type") and data["analysis_type"] not in AnalysisService.ANALYSIS_TYPES:
            raise ValueError("Invalid analysis type")

        if data.get("request_status") and data["request_status"] not in AnalysisService.REQUEST_STATUSES:
            raise ValueError("Invalid request status")

    @staticmethod
    def _validate_score_data(data):
        score_fields = ["total_score", "trust_score", "ad_score", "place_score", "foreigner_score"]

        for field in score_fields:
            value = data.get(field)
            if value is not None and not 0 <= value <= 100:
                raise ValueError(f"{field} must be between 0 and 100")

    @staticmethod
    def _history_item_to_dict(analysis_request):
        hospital = analysis_request.hospital
        analysis_result = analysis_request.analysis_result
        category = {
            "dermatology": "derma",
            "ophthalmology": "eye",
            "dentistry": "dental",
        }.get(hospital.category, hospital.category)

        return {
            "id": analysis_request.id,
            "member_id": analysis_request.member_id,
            "hospital_name": hospital.hospital_name,
            "hospital_category": hospital.category,
            "category": category,
            "hospital_address": hospital.address,
            "region": hospital.region,
            "score": analysis_result.total_score if analysis_result and analysis_result.total_score is not None else 0,
            "total_score": analysis_result.total_score if analysis_result else None,
            "trust_score": analysis_result.trust_score if analysis_result else None,
            "foreigner_score": analysis_result.foreigner_score if analysis_result else None,
            "place_score": analysis_result.place_score if analysis_result else None,
            "ad_score": analysis_result.ad_score if analysis_result else None,
            "trust_level": analysis_result.trust_level if analysis_result else None,
            "ad_suspicion_level": analysis_result.ad_suspicion if analysis_result else None,
            "summary": (
                analysis_result.summary_ko or analysis_result.summary_en
                if analysis_result
                else None
            ),
            "selected_review_count": analysis_request.review_count,
            "total_review_count": analysis_request.review_count,
            "result_status": "completed" if analysis_request.request_status == "success" else analysis_request.request_status,
            "created_at": (
                analysis_request.completed_at or analysis_request.created_at
            ).isoformat() if (analysis_request.completed_at or analysis_request.created_at) else None,
        }
