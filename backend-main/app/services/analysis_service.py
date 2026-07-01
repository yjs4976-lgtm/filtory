from datetime import datetime, timezone

from app.clients.ai_review_analysis_client import AIReviewAnalysisClient
from app.extensions import db
from app.repositories import AnalysisRepository, ReviewRepository
from app.schemas import (
    analysis_ai_response_to_result_data,
    analysis_request_to_dict,
    analysis_result_to_dict,
    extract_analysis_request_data,
    extract_analysis_result_data,
    extract_review_data,
    integrated_analysis_to_dict,
)
from app.services.hospital_service import HospitalService


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
    def analyze_reviews(member_id, payload):
        data = AnalysisService._normalize_integrated_payload(payload)
        hospital = None
        analysis_request = None
        reviews = []

        try:
            hospital = HospitalService.get_or_create_hospital_for_analysis(data["hospital"])
            db.session.flush()

            analysis_request = AnalysisRepository.create_request(
                {
                    "member_id": member_id,
                    "hospital_id": hospital.id,
                    "analysis_type": "multi_review" if len(data["reviews"]) > 1 else "single_review",
                    "request_status": "pending",
                    "input_language": data["input_language"],
                    "output_language": data["output_language"],
                    "review_count": len(data["reviews"]),
                    "request_options_json": AnalysisService._request_options_json(data),
                }
            )
            db.session.flush()

            for review_text in data["reviews"]:
                review = ReviewRepository.create(
                    {
                        "member_id": member_id,
                        "hospital_id": hospital.id,
                        "request_id": analysis_request.id,
                        "review_original": review_text,
                        "review_language": data["input_language"],
                        "source_platform": "user_input",
                    }
                )
                reviews.append(review)

            analysis_request.request_status = "analyzing"
            analysis_request.started_at = datetime.now(timezone.utc)
            db.session.commit()
        except ValueError:
            db.session.rollback()
            raise
        except Exception as exc:
            db.session.rollback()
            raise RuntimeError("Failed to prepare review analysis request") from exc

        backend_ai_payload = AnalysisService._backend_ai_payload(data, hospital)

        try:
            ai_response = AIReviewAnalysisClient.analyze(backend_ai_payload)
        except RuntimeError as exc:
            AnalysisService._mark_request_failed(analysis_request, "Backend AI review analysis failed")
            raise RuntimeError("Backend AI review analysis failed") from exc

        try:
            review_ids = [review.id for review in reviews]
            result_data = analysis_ai_response_to_result_data(
                ai_response,
                member_id=member_id,
                hospital_id=hospital.id,
                request_id=analysis_request.id,
                review_ids=review_ids,
                output_language=data["output_language"],
            )
            AnalysisService._validate_score_data(result_data)
            analysis_result = AnalysisRepository.create_result(result_data)
            analysis_request.request_status = "success"
            analysis_request.completed_at = datetime.now(timezone.utc)
            analysis_request.error_message = None
            db.session.commit()
        except Exception as exc:
            db.session.rollback()
            AnalysisService._mark_request_failed(analysis_request, "Failed to save review analysis result")
            raise RuntimeError("Failed to save review analysis result") from exc

        return integrated_analysis_to_dict(
            analysis_request,
            analysis_result,
            hospital,
            reviews,
            ai_response,
        )

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

    @staticmethod
    def _mark_request_failed(analysis_request, message):
        try:
            analysis_request.request_status = "failed"
            analysis_request.error_message = message
            analysis_request.completed_at = datetime.now(timezone.utc)
            db.session.commit()
        except Exception:
            db.session.rollback()
            raise

    @staticmethod
    def _normalize_integrated_payload(payload):
        reviews = AnalysisService._normalize_reviews(payload)
        if not reviews:
            raise ValueError("reviewText or reviews is required")

        output_language = AnalysisService._normalize_language(
            AnalysisService._pick(payload, "outputLanguage", "output_language"),
            {"ko", "en"},
            "ko",
        )
        input_language = AnalysisService._normalize_language(
            AnalysisService._pick(payload, "inputLanguage", "input_language"),
            {"ko", "en", "unknown"},
            output_language,
        )
        hospital = AnalysisService._normalize_hospital_payload(payload)

        return {
            "reviews": reviews,
            "input_language": input_language,
            "output_language": output_language,
            "hospital": hospital,
            "backend_ai_metadata": AnalysisService._backend_ai_metadata(payload, hospital),
        }

    @staticmethod
    def _normalize_reviews(payload):
        reviews = []
        review_text = AnalysisService._pick(payload, "reviewText", "review_text")
        if isinstance(review_text, str) and review_text.strip():
            reviews.append(review_text.strip())

        reviews_payload = payload.get("reviews") or []
        if isinstance(reviews_payload, list):
            reviews.extend(
                review.strip()
                for review in reviews_payload
                if isinstance(review, str) and review.strip()
            )

        return reviews

    @staticmethod
    def _normalize_hospital_payload(payload):
        treatment_items = AnalysisService._pick(payload, "treatmentItems", "treatment_items")
        return {
            "hospital_id": AnalysisService._optional_int(AnalysisService._pick(payload, "hospitalId", "hospital_id")),
            "hospital_name": AnalysisService._pick(payload, "hospitalName", "hospital_name"),
            "category": AnalysisService._pick(payload, "category"),
            "address": AnalysisService._pick(payload, "address"),
            "phone": AnalysisService._pick(payload, "phone"),
            "homepage_url": AnalysisService._pick(payload, "homepageUrl", "homepage_url"),
            "treatment_items": AnalysisService._text_value(treatment_items),
            "description": AnalysisService._pick(payload, "description"),
            "has_photos": AnalysisService._pick(payload, "hasPhotos", "has_photos"),
            "naver_place_url": AnalysisService._pick(payload, "naverPlaceUrl", "naver_place_url"),
            "naver_place_id": AnalysisService._pick(payload, "naverPlaceId", "naver_place_id"),
            "google_map_url": AnalysisService._pick(payload, "googleMapUrl", "google_map_url"),
            "google_place_id": AnalysisService._pick(payload, "googlePlaceId", "google_place_id"),
            "google_registered": AnalysisService._pick(payload, "googleRegistered", "google_registered"),
            "english_name": AnalysisService._pick(payload, "englishName", "english_name"),
            "has_english_info": AnalysisService._pick(payload, "hasEnglishInfo", "has_english_info"),
            "has_english_reviews": AnalysisService._pick(payload, "hasEnglishReviews", "has_english_reviews"),
            "has_google_photos": AnalysisService._pick(payload, "hasGooglePhotos", "has_google_photos"),
        }

    @staticmethod
    def _backend_ai_metadata(payload, hospital):
        treatment_items = AnalysisService._pick(payload, "treatmentItems", "treatment_items")
        if isinstance(treatment_items, str):
            treatment_items = [item.strip() for item in treatment_items.split(",") if item.strip()]
        elif not isinstance(treatment_items, list):
            treatment_items = []

        return {
            "hospitalName": hospital.get("hospital_name"),
            "address": hospital.get("address"),
            "phone": hospital.get("phone"),
            "homepageUrl": hospital.get("homepage_url"),
            "treatmentItems": treatment_items,
            "description": hospital.get("description"),
            "hasPhotos": hospital.get("has_photos"),
            "naverPlaceUrl": hospital.get("naver_place_url"),
            "naverPlaceId": hospital.get("naver_place_id"),
            "googleMapUrl": hospital.get("google_map_url"),
            "googlePlaceId": hospital.get("google_place_id"),
            "googleRegistered": hospital.get("google_registered"),
            "englishName": hospital.get("english_name"),
            "hasEnglishInfo": hospital.get("has_english_info"),
            "hasEnglishReviews": hospital.get("has_english_reviews"),
            "hasGooglePhotos": hospital.get("has_google_photos"),
        }

    @staticmethod
    def _backend_ai_payload(data, hospital):
        payload = {
            "category": hospital.category,
            "hospitalName": hospital.hospital_name,
            "reviews": data["reviews"],
            "outputLanguage": data["output_language"],
            "address": hospital.address,
            "phone": hospital.phone,
            "homepageUrl": hospital.homepage_url,
            "treatmentItems": data["backend_ai_metadata"]["treatmentItems"],
            "description": hospital.description,
            "hasPhotos": hospital.has_photos,
            "naverPlaceUrl": hospital.naver_place_url,
            "naverPlaceId": hospital.naver_place_id,
            "googleMapUrl": hospital.google_map_url,
            "googlePlaceId": hospital.google_place_id,
            "googleRegistered": hospital.google_registered,
            "englishName": hospital.english_name,
            "hasEnglishInfo": hospital.has_english_info,
            "hasEnglishReviews": hospital.has_english_reviews,
            "hasGooglePhotos": hospital.has_google_photos,
        }
        return {key: value for key, value in payload.items() if value is not None}

    @staticmethod
    def _request_options_json(data):
        metadata = {
            key: value
            for key, value in data["backend_ai_metadata"].items()
            if value not in (None, "", [])
        }
        return {
            "source": "user_input",
            "reviewCount": len(data["reviews"]),
            "outputLanguage": data["output_language"],
            "hospitalMetadata": metadata,
            "backendAiPayloadSummary": {
                "category": data["hospital"].get("category"),
                "reviewCount": len(data["reviews"]),
                "outputLanguage": data["output_language"],
            },
        }

    @staticmethod
    def _pick(payload, *keys):
        for key in keys:
            if key in payload:
                return payload[key]
        return None

    @staticmethod
    def _normalize_language(value, allowed, default):
        language = str(value or default or "").strip().lower()
        if language in allowed:
            return language
        if "unknown" in allowed:
            return "unknown"
        return default

    @staticmethod
    def _optional_int(value):
        if value in (None, ""):
            return None
        try:
            return int(value)
        except (TypeError, ValueError):
            raise ValueError("hospital_id must be an integer")

    @staticmethod
    def _text_value(value):
        if isinstance(value, list):
            return ", ".join(str(item).strip() for item in value if str(item).strip())
        if value is None:
            return None
        return str(value).strip() or None
