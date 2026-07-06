import logging
from datetime import datetime, timezone
from urllib.parse import urlparse

from app.clients.ai_review_analysis_client import AIReviewAnalysisClient
from app.extensions import db
from app.repositories import AdminRepository, AnalysisRepository, HospitalEnrichmentSuggestionRepository, ReviewRepository
from app.schemas import (
    analysis_ai_response_to_result_data,
    analysis_request_to_dict,
    analysis_result_to_canonical_dict,
    analysis_result_to_dict,
    extract_analysis_request_data,
    extract_analysis_result_data,
    extract_review_data,
    integrated_analysis_to_dict,
)
from app.services.hospital_service import HospitalService

logger = logging.getLogger(__name__)


class AnalysisService:
    # 분석 도메인의 중심 서비스다.
    # 프론트 요청을 받아 병원/리뷰/분석요청/분석결과/알림까지 이어지는 전체 업무 흐름을 조율한다.
    # 실제 DB 조회/저장은 Repository가, AI 호출은 Client가, 응답 변환은 Schema helper가 맡는다.
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
    def list_member_history(member_id, limit=20, offset=0, trashed=False):
        # 마이페이지/히스토리 화면용 목록이다. request와 result, hospital을 합쳐 화면용 dict로 만든다.
        analysis_requests = AnalysisRepository.list_history_by_member(
            member_id,
            limit=limit,
            offset=offset,
            trashed=trashed,
        )
        return [AnalysisService._history_item_to_dict(analysis_request) for analysis_request in analysis_requests]

    @staticmethod
    def delete_member_history(member_id, request_id):
        return AnalysisService.move_member_history_to_trash(
            member_id,
            [request_id],
            deleted_by_member_id=member_id,
        )

    @staticmethod
    def move_member_history_to_trash(member_id, request_ids, deleted_by_member_id):
        # 휴지통 이동은 실제 row 삭제가 아니라 deleted_at/deleted_by만 채우는 soft delete다.
        normalized_ids = AnalysisService._normalize_request_ids(request_ids)
        analysis_requests = AnalysisRepository.list_history_by_ids(
            member_id,
            normalized_ids,
            trashed=False,
        )
        if len(analysis_requests) != len(normalized_ids):
            raise ValueError("Analysis request not found")

        deleted_at = datetime.now(timezone.utc)
        try:
            for analysis_request in analysis_requests:
                analysis_request.deleted_at = deleted_at
                analysis_request.deleted_by = deleted_by_member_id

            db.session.commit()
            return {
                "ids": [analysis_request.id for analysis_request in analysis_requests],
                "deleted_at": deleted_at.isoformat(),
            }
        except Exception:
            db.session.rollback()
            raise

    @staticmethod
    def restore_member_history(member_id, request_ids):
        normalized_ids = AnalysisService._normalize_request_ids(request_ids)
        analysis_requests = AnalysisRepository.list_history_by_ids(
            member_id,
            normalized_ids,
            trashed=True,
        )
        if len(analysis_requests) != len(normalized_ids):
            raise ValueError("Analysis request not found")

        try:
            for analysis_request in analysis_requests:
                analysis_request.deleted_at = None
                analysis_request.deleted_by = None

            db.session.commit()
            return {"ids": [analysis_request.id for analysis_request in analysis_requests]}
        except Exception:
            db.session.rollback()
            raise

    @staticmethod
    def permanently_delete_member_history(member_id, request_ids=None):
        # 휴지통에서 완전 삭제할 때만 row를 제거한다. ids가 없으면 해당 회원의 휴지통 전체를 비운다.
        normalized_ids = AnalysisService._normalize_request_ids(request_ids, allow_empty=True)
        if normalized_ids:
            analysis_requests = AnalysisRepository.list_history_by_ids(
                member_id,
                normalized_ids,
                trashed=True,
            )
            if len(analysis_requests) != len(normalized_ids):
                raise ValueError("Analysis request not found")
        else:
            analysis_requests = AnalysisRepository.list_history_by_member(
                member_id,
                limit=1000,
                offset=0,
                trashed=True,
            )

        try:
            deleted_ids = [analysis_request.id for analysis_request in analysis_requests]
            for analysis_request in analysis_requests:
                AnalysisRepository.delete_request(analysis_request)

            db.session.commit()
            return {"ids": deleted_ids}
        except Exception:
            db.session.rollback()
            raise

    @staticmethod
    def hard_delete_member_history(member_id, request_id):
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
            # 분석 요청은 먼저 병원, 요청 기록, 원본 리뷰를 DB에 남긴 뒤 backend-ai를 호출한다.
            # AI 호출 전에 commit해 두면 실패 시에도 어떤 요청이 실패했는지 추적할 수 있다.
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
            logger.warning(
                "Failed to prepare review analysis request: %s",
                exc.__class__.__name__,
            )
            raise RuntimeError("Failed to prepare review analysis request") from exc

        backend_ai_payload = AnalysisService._backend_ai_payload(data, hospital)

        try:
            # 실제 LLM/Mock 선택은 backend-ai가 담당하고, backend-main은 표준 payload만 전달한다.
            ai_response = AIReviewAnalysisClient.analyze(backend_ai_payload)
        except RuntimeError as exc:
            AnalysisService._mark_request_failed(analysis_request, "Backend AI review analysis failed")
            raise RuntimeError("Backend AI review analysis failed") from exc

        try:
            # backend-ai 응답은 그대로 저장하지 않고 analysis_results 테이블 스키마에 맞게 정규화한다.
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
            db.session.flush()
            AnalysisService._create_moderation_cases_for_result(analysis_result)
            analysis_request.request_status = "success"
            analysis_request.completed_at = datetime.now(timezone.utc)
            analysis_request.error_message = None
            from app.services.notification_service import NotificationService

            # 분석 완료 알림은 결과 저장과 같은 트랜잭션에서 생성해 히스토리/알림 상태를 맞춘다.
            NotificationService.create_analysis_completed_notification(
                member_id,
                hospital.hospital_name if hospital else None,
                analysis_request.id,
                analysis_result.id,
                analysis_result.total_score,
            )
            db.session.commit()
        except Exception as exc:
            db.session.rollback()
            logger.warning(
                "Failed to save review analysis result: %s",
                exc.__class__.__name__,
            )
            AnalysisService._mark_request_failed(analysis_request, "Failed to save review analysis result")
            raise RuntimeError("Failed to save review analysis result") from exc

        response = integrated_analysis_to_dict(
            analysis_request,
            analysis_result,
            hospital,
            reviews,
            ai_response,
        )

        # 병원 메타데이터 개선 제안은 실패해도 분석 결과 제공을 막지 않는 부가 작업이다.
        AnalysisService._try_create_enrichment_suggestion(
            data["hospital"],
            hospital_id=hospital.id,
            analysis_request_id=analysis_request.id,
            member_id=member_id,
        )

        return response

    @staticmethod
    def create_request(payload):
        # 관리자/테스트용으로 분석 요청 row를 직접 만드는 낮은 수준의 API에서 사용한다.
        # 일반 사용자의 실제 리뷰 분석은 analyze_reviews() 경로를 탄다.
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
        # 관리자/테스트용으로 분석 결과 row를 직접 저장하는 경로다.
        # 실제 사용자 분석에서는 backend-ai 응답을 analysis_ai_response_to_result_data()로 변환해 저장한다.
        data = extract_analysis_result_data(payload)
        AnalysisService._validate_score_data(data)

        try:
            analysis_result = AnalysisRepository.create_result(data)
            db.session.flush()
            AnalysisService._create_moderation_cases_for_result(analysis_result)

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
    def _normalize_request_ids(request_ids, allow_empty=False):
        if request_ids is None:
            if allow_empty:
                return []
            raise ValueError("ids are required")

        if isinstance(request_ids, (str, int)):
            request_ids = [request_ids]

        if not isinstance(request_ids, list):
            raise ValueError("ids must be a list")

        normalized_ids = []
        for request_id in request_ids:
            try:
                numeric_id = int(request_id)
            except (TypeError, ValueError) as exc:
                raise ValueError("ids must contain numeric request ids") from exc

            if numeric_id <= 0:
                raise ValueError("ids must contain positive request ids")
            if numeric_id not in normalized_ids:
                normalized_ids.append(numeric_id)

        if not normalized_ids and not allow_empty:
            raise ValueError("ids are required")

        return normalized_ids

    @staticmethod
    def _history_item_to_dict(analysis_request):
        # 히스토리 화면은 과거 mock/local 데이터와 실제 DB 데이터를 함께 읽어야 해서 camelCase/snake_case를 모두 채운다.
        hospital = analysis_request.hospital
        analysis_result = analysis_request.analysis_result
        request_options = (
            analysis_request.request_options_json
            if isinstance(analysis_request.request_options_json, dict)
            else {}
        )
        hospital_metadata = (
            request_options.get("hospitalMetadata")
            if isinstance(request_options.get("hospitalMetadata"), dict)
            else {}
        )
        hospital_category = hospital.category if hospital else "dermatology"
        category = {
            "dermatology": "derma",
            "ophthalmology": "eye",
            "dentistry": "dental",
        }.get(hospital_category, hospital_category)
        canonical_result = analysis_result_to_canonical_dict(analysis_result)
        hospital_name = hospital.hospital_name if hospital else "Unknown hospital"
        hospital_english_name = AnalysisService._first_present(
            hospital_metadata.get("englishName"),
            hospital_metadata.get("english_name"),
            hospital.english_name if hospital else None,
        )
        hospital_road_address = AnalysisService._first_present(
            hospital.road_address if hospital else None,
            hospital_metadata.get("roadAddress"),
            hospital_metadata.get("road_address"),
        )
        hospital_address = AnalysisService._first_present(
            hospital_road_address,
            hospital.address if hospital else None,
            hospital_metadata.get("address"),
        )

        return {
            **canonical_result,
            "id": analysis_request.id,
            "analysisRequestId": analysis_request.id,
            "analysisResultId": analysis_result.id if analysis_result else None,
            "member_id": analysis_request.member_id,
            "hospital_name": hospital_name,
            "hospitalName": hospital_name,
            "hospital_name_ko": hospital_name,
            "hospitalNameKo": hospital_name,
            "hospital_name_en": hospital_english_name,
            "hospitalNameEn": hospital_english_name,
            "hospital_english_name": hospital_english_name,
            "hospitalEnglishName": hospital_english_name,
            "english_name": hospital_english_name,
            "englishName": hospital_english_name,
            "hospital_category": hospital_category,
            "category": category,
            "hospital_address": hospital_address or "",
            "hospitalAddress": hospital_address or "",
            "road_address": hospital_road_address,
            "roadAddress": hospital_road_address,
            "address": hospital.address if hospital else hospital_metadata.get("address"),
            "region": hospital.region if hospital else "",
            "score": analysis_result.total_score if analysis_result and analysis_result.total_score is not None else 0,
            "total_score": analysis_result.total_score if analysis_result else None,
            "totalScore": analysis_result.total_score if analysis_result else None,
            "trust_score": analysis_result.trust_score if analysis_result else None,
            "trustScore": analysis_result.trust_score if analysis_result else None,
            "foreigner_score": analysis_result.foreigner_score if analysis_result else None,
            "foreignerFriendlyScore": analysis_result.foreigner_score if analysis_result else None,
            "place_score": analysis_result.place_score if analysis_result else None,
            "placeScore": analysis_result.place_score if analysis_result else None,
            "ad_score": analysis_result.ad_score if analysis_result else None,
            "adScore": analysis_result.ad_score if analysis_result else None,
            "trust_level": analysis_result.trust_level if analysis_result else None,
            "ad_suspicion_level": analysis_result.ad_suspicion if analysis_result else None,
            "trustGrade": canonical_result.get("trustGrade"),
            "trustLevelKey": canonical_result.get("trustLevelKey"),
            "adSuspicionScore": canonical_result.get("adSuspicionScore"),
            "adSuspicionLevel": canonical_result.get("adSuspicionLevel"),
            "informationScore": canonical_result.get("informationScore"),
            "informationLevel": canonical_result.get("informationLevel"),
            "globalAccessibilityScore": canonical_result.get("globalAccessibilityScore"),
            "globalAccessibilityLevel": canonical_result.get("globalAccessibilityLevel"),
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
            "deleted_at": analysis_request.deleted_at.isoformat() if analysis_request.deleted_at else None,
            "deleted_by": analysis_request.deleted_by,
        }

    @staticmethod
    def _mark_request_failed(analysis_request, message):
        # AI 호출 또는 결과 저장이 실패했을 때 request row에 실패 상태를 남겨 사용자가 원인을 추적할 수 있게 한다.
        try:
            analysis_request.request_status = "failed"
            analysis_request.error_message = message
            analysis_request.completed_at = datetime.now(timezone.utc)
            db.session.commit()
        except Exception:
            db.session.rollback()
            raise

    @staticmethod
    def _create_moderation_cases_for_result(analysis_result):
        score_snapshot = {
            "totalScore": analysis_result.total_score,
            "trustScore": analysis_result.trust_score,
            "adScore": analysis_result.ad_score,
            "placeScore": analysis_result.place_score,
            "foreignerScore": analysis_result.foreigner_score,
            "adSuspicion": analysis_result.ad_suspicion,
            "repetitionSuspicion": analysis_result.repetition_suspicion,
        }

        if AnalysisService._is_high_ad_suspicion(analysis_result):
            AdminRepository.create_review_case_if_absent(
                {
                    "hospital_id": analysis_result.hospital_id,
                    "review_id": analysis_result.review_id,
                    "analysis_result_id": analysis_result.id,
                    "case_type": "ad_suspicion",
                    "status": "pending",
                    "priority": "high" if (analysis_result.ad_score or 0) >= 80 else "normal",
                    "reason": "Analysis result marked this review as high ad suspicion.",
                    "score_snapshot": score_snapshot,
                }
            )

        if AnalysisService._is_high_repetition_suspicion(analysis_result):
            AdminRepository.create_review_case_if_absent(
                {
                    "hospital_id": analysis_result.hospital_id,
                    "review_id": analysis_result.review_id,
                    "analysis_result_id": analysis_result.id,
                    "case_type": "repetition_pattern",
                    "status": "pending",
                    "priority": "normal",
                    "reason": "Analysis result found a high repeated-pattern signal.",
                    "score_snapshot": score_snapshot,
                }
            )

    @staticmethod
    def _is_high_ad_suspicion(analysis_result):
        level = str(analysis_result.ad_suspicion or "").strip().lower()
        return (analysis_result.ad_score or 0) >= 70 or level in {"high", "높음", "위험"}

    @staticmethod
    def _is_high_repetition_suspicion(analysis_result):
        level = str(analysis_result.repetition_suspicion or "").strip().lower()
        return level in {"high", "높음", "위험"}

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
            "review_dates": AnalysisService._normalize_review_dates(payload, len(reviews)),
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
    def _normalize_review_dates(payload, review_count):
        raw_dates = AnalysisService._pick(payload, "reviewDates", "review_dates")
        if not isinstance(raw_dates, list):
            return []

        dates = []
        for value in raw_dates[:review_count]:
            text = str(value or "").strip()
            dates.append(text)
        return dates

    @staticmethod
    def _normalize_hospital_payload(payload):
        treatment_items = AnalysisService._pick(payload, "treatmentItems", "treatment_items")
        return {
            "hospital_id": AnalysisService._optional_int(AnalysisService._pick(payload, "hospitalId", "hospital_id")),
            "hospital_name": AnalysisService._pick(payload, "hospitalName", "hospital_name"),
            "category": AnalysisService._pick(payload, "category"),
            "address": AnalysisService._pick(payload, "address"),
            "road_address": AnalysisService._pick(payload, "roadAddress", "road_address"),
            "phone": AnalysisService._pick(payload, "phone"),
            "homepage_url": AnalysisService._pick(payload, "homepageUrl", "homepage_url"),
            "source_provider": AnalysisService._pick(payload, "sourceProvider", "source_provider"),
            "external_place_id": AnalysisService._pick(payload, "externalPlaceId", "external_place_id"),
            "kakao_place_url": AnalysisService._pick(payload, "kakaoPlaceUrl", "kakao_place_url"),
            "latitude": AnalysisService._pick(payload, "latitude", "lat"),
            "longitude": AnalysisService._pick(payload, "longitude", "lng"),
            "treatment_items": AnalysisService._text_value(treatment_items),
            "description": AnalysisService._pick(payload, "description"),
            "has_photos": AnalysisService._pick(payload, "hasPhotos", "has_photos"),
            "naver_place_url": AnalysisService._pick(payload, "naverPlaceUrl", "naver_place_url"),
            "naver_place_id": AnalysisService._pick(payload, "naverPlaceId", "naver_place_id"),
            "naver_rating": AnalysisService._pick(payload, "naverRating", "naver_rating"),
            "naver_review_count": AnalysisService._pick(payload, "naverReviewCount", "naver_review_count"),
            "google_map_url": AnalysisService._pick(payload, "googleMapUrl", "google_map_url"),
            "google_place_id": AnalysisService._pick(payload, "googlePlaceId", "google_place_id"),
            "google_rating": AnalysisService._pick(payload, "googleRating", "google_rating"),
            "google_review_count": AnalysisService._pick(payload, "googleReviewCount", "google_review_count"),
            "google_registered": AnalysisService._pick(payload, "googleRegistered", "google_registered"),
            "english_name": AnalysisService._pick(payload, "englishName", "english_name"),
            "has_english_info": AnalysisService._pick(payload, "hasEnglishInfo", "has_english_info"),
            "has_english_reviews": AnalysisService._pick(
                payload,
                "englishReviews",
                "hasEnglishReviews",
                "has_english_reviews",
            ),
            "has_google_photos": AnalysisService._pick(payload, "hasGooglePhotos", "has_google_photos"),
        }

    @staticmethod
    def _create_enrichment_suggestion(hospital, *, hospital_id, analysis_request_id, member_id):
        suggestion = AnalysisService._enrichment_suggestion_data(
            hospital,
            hospital_id=hospital_id,
            analysis_request_id=analysis_request_id,
            member_id=member_id,
        )
        if suggestion:
            return HospitalEnrichmentSuggestionRepository.create(suggestion)
        return None

    @staticmethod
    def _try_create_enrichment_suggestion(hospital, *, hospital_id, analysis_request_id, member_id):
        try:
            created = AnalysisService._create_enrichment_suggestion(
                hospital,
                hospital_id=hospital_id,
                analysis_request_id=analysis_request_id,
                member_id=member_id,
            )
            if created:
                db.session.commit()
        except Exception as exc:
            db.session.rollback()
            logger.warning(
                "Hospital enrichment suggestion was skipped: %s",
                exc.__class__.__name__,
            )

    @staticmethod
    def _enrichment_suggestion_data(hospital, *, hospital_id, analysis_request_id, member_id):
        english_name = AnalysisService._clean_text(hospital.get("english_name"))
        homepage_url = AnalysisService._valid_http_url(hospital.get("homepage_url"))
        has_english_info = AnalysisService._true_or_none(hospital.get("has_english_info"))
        has_english_reviews = AnalysisService._true_or_none(hospital.get("has_english_reviews"))
        has_photos = AnalysisService._true_or_none(
            AnalysisService._first_present(hospital.get("has_photos"), hospital.get("has_google_photos"))
        )

        if not any([english_name, homepage_url, has_english_info, has_english_reviews, has_photos]):
            return None

        return {
            "hospital_id": hospital_id,
            "analysis_request_id": analysis_request_id,
            "source_member_id": member_id,
            "source_type": "user_input",
            "status": "pending",
            "suggested_english_name": english_name,
            "suggested_homepage_url": homepage_url,
            "suggested_has_english_info": has_english_info,
            "suggested_has_english_reviews": has_english_reviews,
            "suggested_has_photos": has_photos,
        }

    @staticmethod
    def _clean_text(value):
        if not isinstance(value, str):
            return None
        text = value.strip()
        return text or None

    @staticmethod
    def _valid_http_url(value):
        text = AnalysisService._clean_text(value)
        if not text:
            return None

        parsed = urlparse(text)
        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            raise ValueError("Invalid homepage URL")

        return text

    @staticmethod
    def _true_or_none(value):
        return True if value is True else None

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
            "roadAddress": hospital.get("road_address"),
            "phone": hospital.get("phone"),
            "homepageUrl": hospital.get("homepage_url"),
            "sourceProvider": hospital.get("source_provider"),
            "externalPlaceId": hospital.get("external_place_id"),
            "kakaoPlaceUrl": hospital.get("kakao_place_url"),
            "latitude": hospital.get("latitude"),
            "longitude": hospital.get("longitude"),
            "treatmentItems": treatment_items,
            "description": hospital.get("description"),
            "hasPhotos": hospital.get("has_photos"),
            "naverPlaceUrl": hospital.get("naver_place_url"),
            "naverPlaceId": hospital.get("naver_place_id"),
            "naverRating": hospital.get("naver_rating"),
            "naverReviewCount": hospital.get("naver_review_count"),
            "googleMapUrl": hospital.get("google_map_url"),
            "googlePlaceId": hospital.get("google_place_id"),
            "googleRating": hospital.get("google_rating"),
            "googleReviewCount": hospital.get("google_review_count"),
            "googleRegistered": hospital.get("google_registered"),
            "englishName": hospital.get("english_name"),
            "hasEnglishInfo": hospital.get("has_english_info"),
            "hasEnglishReviews": hospital.get("has_english_reviews"),
            "englishReviews": hospital.get("has_english_reviews"),
            "hasGooglePhotos": hospital.get("has_google_photos"),
        }

    @staticmethod
    def _backend_ai_payload(data, hospital):
        metadata = data["backend_ai_metadata"]
        payload = {
            "category": hospital.category,
            "hospitalName": hospital.hospital_name,
            "reviews": data["reviews"],
            "reviewDates": data["review_dates"],
            "outputLanguage": data["output_language"],
            "address": hospital.address,
            "roadAddress": hospital.road_address,
            "phone": hospital.phone,
            "homepageUrl": AnalysisService._first_present(metadata.get("homepageUrl"), hospital.homepage_url),
            "sourceProvider": hospital.source_provider,
            "externalPlaceId": hospital.external_place_id,
            "kakaoPlaceUrl": AnalysisService._first_present(metadata.get("kakaoPlaceUrl"), hospital.kakao_place_url),
            "latitude": float(hospital.latitude) if hospital.latitude is not None else None,
            "longitude": float(hospital.longitude) if hospital.longitude is not None else None,
            "treatmentItems": metadata["treatmentItems"],
            "description": hospital.description,
            "hasPhotos": AnalysisService._first_present(metadata.get("hasPhotos"), hospital.has_photos),
            "naverPlaceUrl": AnalysisService._first_present(metadata.get("naverPlaceUrl"), hospital.naver_place_url),
            "naverPlaceId": AnalysisService._first_present(metadata.get("naverPlaceId"), hospital.naver_place_id),
            "googleMapUrl": AnalysisService._first_present(metadata.get("googleMapUrl"), hospital.google_map_url),
            "googlePlaceId": AnalysisService._first_present(metadata.get("googlePlaceId"), hospital.google_place_id),
            "googleRegistered": AnalysisService._first_present(metadata.get("googleRegistered"), hospital.google_registered),
            "englishName": AnalysisService._first_present(metadata.get("englishName"), hospital.english_name),
            "hasEnglishInfo": AnalysisService._first_present(metadata.get("hasEnglishInfo"), hospital.has_english_info),
            "hasEnglishReviews": AnalysisService._first_present(metadata.get("hasEnglishReviews"), hospital.has_english_reviews),
            "englishReviews": AnalysisService._first_present(metadata.get("englishReviews"), hospital.has_english_reviews),
            "hasGooglePhotos": AnalysisService._first_present(metadata.get("hasGooglePhotos"), hospital.has_google_photos),
        }
        return {key: value for key, value in payload.items() if value is not None}

    @staticmethod
    def _first_present(*values):
        for value in values:
            if value not in (None, "", [], {}):
                return value
        return None

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
            "reviewDates": data["review_dates"],
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
