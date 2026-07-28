from datetime import datetime, timezone
from urllib.parse import urlparse

from app.extensions import db
from app.repositories import AdminRepository
from app.schemas import admin_member_to_dict


class AdminService:
    ROLES = {"user", "admin"}
    STATUSES = {"active", "suspended", "withdrawn", "dormant"}
    REVIEW_CASE_TYPES = {
        "ad_suspicion",
        "repetition_pattern",
        "inappropriate_content",
        "user_report",
        "wrong_hospital_info",
        "manual_review",
        "other",
    }
    REVIEW_CASE_STATUSES = {"pending", "reviewing", "resolved"}
    REVIEW_CASE_FINAL_STATUSES = {"resolved"}
    HOSPITAL_CATEGORIES = {"dermatology", "ophthalmology", "dentistry"}
    HOSPITAL_STATUSES = {"active", "needs_review", "hidden", "archived"}
    ANALYSIS_STATUSES = {"pending", "analyzing", "success", "failed", "canceled"}
    ANALYSIS_TYPES = {"single_review", "multi_review", "place_only", "full"}
    USAGE_TYPES = {"FREE_BASE", "PLUS", "REWARDED", "ADMIN_GRANTED"}

    @staticmethod
    def get_summary():
        summary = {
            "totalUsers": AdminRepository.count_members(),
            "activeUsers": AdminRepository.count_members(status="active"),
            "suspendedUsers": AdminRepository.count_members(status="suspended"),
            "withdrawnUsers": AdminRepository.count_members(status="withdrawn"),
        }
        summary.update(AdminRepository.analysis_summary_counts())
        return summary

    @staticmethod
    def list_analyses(keyword=None, status=None, category=None, analysis_type=None, limit=20, offset=0):
        rows, total = AdminRepository.list_analyses(
            keyword=keyword,
            status=AdminService._normalize_optional(status, AdminService.ANALYSIS_STATUSES, "analysis status"),
            category=AdminService._normalize_optional(category, AdminService.HOSPITAL_CATEGORIES, "hospital category"),
            analysis_type=AdminService._normalize_optional(analysis_type, AdminService.ANALYSIS_TYPES, "analysis type"),
            limit=limit,
            offset=offset,
        )
        return [AdminService._analysis_to_dict(item) for item in rows], total

    @staticmethod
    def list_errors(keyword=None, category=None, analysis_type=None, limit=20, offset=0):
        rows, total = AdminRepository.list_analyses(
            keyword=keyword,
            category=AdminService._normalize_optional(category, AdminService.HOSPITAL_CATEGORIES, "hospital category"),
            analysis_type=AdminService._normalize_optional(analysis_type, AdminService.ANALYSIS_TYPES, "analysis type"),
            errors_only=True,
            limit=limit,
            offset=offset,
        )
        return [
            {
                **AdminService._analysis_to_dict(item),
                "retryAvailable": False,
            }
            for item in rows
        ], total

    @staticmethod
    def list_usage_logs(keyword=None, usage_type=None, period_key=None, limit=20, offset=0):
        normalized_period = AdminService._normalize_period_key(period_key)
        rows, total = AdminRepository.list_usage_logs(
            keyword=keyword,
            usage_type=AdminService._normalize_optional(usage_type, AdminService.USAGE_TYPES, "usage type", uppercase=True),
            period_key=normalized_period,
            limit=limit,
            offset=offset,
        )
        return [AdminService._usage_log_to_dict(item) for item in rows], total

    @staticmethod
    def list_members(keyword=None, status=None, role=None, limit=20, offset=0):
        normalized_status = AdminService._normalize_status(status) if status else None
        normalized_role = AdminService._normalize_role(role) if role else None
        members = AdminRepository.list_members(
            keyword=keyword,
            status=normalized_status,
            role=normalized_role,
            limit=limit,
            offset=offset,
        )
        return [AdminService._member_to_dict(member) for member in members]

    @staticmethod
    def get_member(member_id):
        member = AdminRepository.get_member_by_id(member_id)
        if not member:
            raise ValueError("Member not found")
        return AdminService._member_to_dict(member)

    @staticmethod
    def update_member_role(member_id, role, admin_member_id):
        member = AdminService._get_mutable_member(member_id, admin_member_id)
        normalized_role = AdminService._normalize_role(role)
        before = {"role": member.role}

        try:
            AdminRepository.update_member(member, {"role": normalized_role})
            AdminService._create_audit_log(
                admin_member_id,
                "member_update",
                member.id,
                before,
                {"role": normalized_role},
            )
            db.session.commit()
            return AdminService._member_to_dict(member)
        except Exception:
            db.session.rollback()
            raise

    @staticmethod
    def update_member_status(member_id, status, admin_member_id):
        member = AdminService._get_mutable_member(member_id, admin_member_id)
        normalized_status = AdminService._normalize_status(status)
        before = {
            "status": member.status,
            "active": member.active,
            "deleted_at": member.deleted_at.isoformat() if member.deleted_at else None,
        }
        data = AdminService._status_update_data(normalized_status)

        try:
            AdminRepository.update_member(member, data)
            AdminService._create_audit_log(
                admin_member_id,
                "member_update",
                member.id,
                before,
                {"status": normalized_status},
            )
            db.session.commit()
            return AdminService._member_to_dict(member)
        except Exception:
            db.session.rollback()
            raise

    @staticmethod
    def withdraw_member(member_id, admin_member_id):
        member = AdminService._get_mutable_member(member_id, admin_member_id)
        before = {"status": member.status}

        try:
            AdminRepository.update_member(member, AdminService._status_update_data("withdrawn"))
            AdminService._create_audit_log(
                admin_member_id,
                "member_deactivate",
                member.id,
                before,
                {"status": "withdrawn"},
            )
            db.session.commit()
        except Exception:
            db.session.rollback()
            raise

    @staticmethod
    def list_review_cases(keyword=None, status=None, case_type=None, limit=20, offset=0):
        normalized_status = AdminService._normalize_review_case_status(status) if status else None
        normalized_case_type = AdminService._normalize_review_case_type(case_type) if case_type else None
        cases, total = AdminRepository.list_review_cases(
            keyword=keyword,
            status=normalized_status,
            case_type=normalized_case_type,
            limit=limit,
            offset=offset,
        )
        return [AdminService._review_case_to_dict(review_case) for review_case in cases], total

    @staticmethod
    def update_review_case_status(case_id, status, admin_member_id, admin_memo=None):
        review_case = AdminRepository.get_review_case_by_id(case_id)
        if not review_case:
            raise ValueError("Review moderation case not found")

        normalized_status = AdminService._normalize_review_case_status(status)
        before = {
            "status": review_case.status,
            "admin_memo": review_case.admin_memo,
            "assigned_admin_member_id": review_case.assigned_admin_member_id,
            "resolved_admin_member_id": review_case.resolved_admin_member_id,
            "resolved_at": AdminService._date_to_str(review_case.resolved_at),
        }
        data = {"status": normalized_status}

        if admin_memo is not None:
            data["admin_memo"] = AdminService._clean_optional_text(admin_memo)

        if normalized_status == "reviewing":
            data["assigned_admin_member_id"] = admin_member_id

        if normalized_status in AdminService.REVIEW_CASE_FINAL_STATUSES:
            data["resolved_admin_member_id"] = admin_member_id
            data["resolved_at"] = datetime.now(timezone.utc)
        elif review_case.status in AdminService.REVIEW_CASE_FINAL_STATUSES:
            data["resolved_admin_member_id"] = None
            data["resolved_at"] = None

        try:
            AdminRepository.update_review_case(review_case, data)
            AdminService._create_audit_log(
                admin_member_id,
                "analysis_review",
                review_case.id,
                before,
                {
                    "status": normalized_status,
                    "admin_memo": data.get("admin_memo", review_case.admin_memo),
                },
                target_table="admin_review_moderation_cases",
            )
            db.session.commit()
            return AdminService._review_case_to_dict(review_case)
        except Exception:
            db.session.rollback()
            raise

    @staticmethod
    def list_hospitals(keyword=None, category=None, status=None, limit=20, offset=0):
        normalized_category = AdminService._normalize_hospital_category(category) if category else None
        normalized_status = AdminService._normalize_hospital_status(status) if status else None
        hospitals, total = AdminRepository.list_hospitals(
            keyword=keyword,
            category=normalized_category,
            status=normalized_status,
            limit=limit,
            offset=offset,
        )
        return [AdminService._hospital_to_admin_dict(hospital) for hospital in hospitals], total

    @staticmethod
    def update_hospital(hospital_id, payload, admin_member_id):
        hospital = AdminRepository.get_hospital_by_id(hospital_id)
        if not hospital:
            raise ValueError("Hospital not found")

        before = AdminService._hospital_audit_snapshot(hospital)
        data = AdminService._hospital_update_data(payload or {}, admin_member_id)

        if not data:
            return AdminService._hospital_to_admin_dict(hospital)

        try:
            AdminRepository.update_hospital(hospital, data)
            AdminService._create_audit_log(
                admin_member_id,
                "hospital_update",
                hospital.id,
                before,
                AdminService._hospital_audit_snapshot(hospital),
                target_table="hospitals",
            )
            db.session.commit()
            return AdminService._hospital_to_admin_dict(hospital)
        except Exception:
            db.session.rollback()
            raise

    @staticmethod
    def _member_to_dict(member):
        return admin_member_to_dict(member, AdminRepository.get_member_activity_counts(member.id))

    @staticmethod
    def _analysis_to_dict(analysis_request):
        member = analysis_request.member
        hospital = analysis_request.hospital
        result = analysis_request.analysis_result
        duration = None
        if analysis_request.started_at and analysis_request.completed_at:
            duration = max(0, int((analysis_request.completed_at - analysis_request.started_at).total_seconds()))

        return {
            "id": analysis_request.id,
            "requestId": analysis_request.id,
            "resultId": result.id if result else None,
            "member": AdminService._member_summary(member),
            "hospital": AdminService._hospital_summary(hospital, include_address=True),
            "analysisType": analysis_request.analysis_type,
            "reviewCount": analysis_request.review_count,
            "status": analysis_request.request_status,
            "totalScore": result.total_score if result else None,
            "trustScore": result.trust_score if result else None,
            "adScore": result.ad_score if result else None,
            "placeScore": result.place_score if result else None,
            "foreignerScore": result.foreigner_score if result else None,
            "trustLevel": result.trust_level if result else None,
            "adSuspicion": result.ad_suspicion if result else None,
            "errorMessage": analysis_request.error_message,
            "startedAt": AdminService._date_to_str(analysis_request.started_at),
            "completedAt": AdminService._date_to_str(analysis_request.completed_at),
            "createdAt": AdminService._date_to_str(analysis_request.created_at),
            "durationSeconds": duration,
        }

    @staticmethod
    def _usage_log_to_dict(usage_log):
        result = usage_log.analysis_result
        return {
            "id": usage_log.id,
            "member": AdminService._member_summary(usage_log.member),
            "analysisResultId": usage_log.analysis_result_id,
            "hospital": AdminService._hospital_summary(result.hospital if result else None),
            "usageType": usage_log.usage_type,
            "periodKey": usage_log.period_key,
            "chargedAt": AdminService._date_to_str(usage_log.charged_at),
            "totalScore": result.total_score if result else None,
            "trustScore": result.trust_score if result else None,
            "adScore": result.ad_score if result else None,
        }

    @staticmethod
    def _member_summary(member):
        if not member:
            return None
        return {"id": member.id, "email": member.email, "nickname": member.nickname}

    @staticmethod
    def _hospital_summary(hospital, include_address=False):
        if not hospital:
            return None
        data = {
            "id": hospital.id,
            "hospitalName": hospital.hospital_name,
            "category": hospital.category,
        }
        if include_address:
            data.update(
                {
                    "region": hospital.region,
                    "address": hospital.road_address or hospital.address,
                }
            )
        return data

    @staticmethod
    def _get_mutable_member(member_id, admin_member_id):
        member = AdminRepository.get_member_by_id(member_id)
        if not member:
            raise ValueError("Member not found")
        if member.id == admin_member_id:
            raise ValueError("Administrators cannot change their own role or status")
        return member

    @staticmethod
    def _normalize_role(role):
        normalized_role = str(role or "").lower()
        if normalized_role not in AdminService.ROLES:
            raise ValueError("Invalid member role")
        return normalized_role

    @staticmethod
    def _normalize_status(status):
        normalized_status = str(status or "").lower()
        if normalized_status not in AdminService.STATUSES:
            raise ValueError("Invalid member status")
        return normalized_status

    @staticmethod
    def _status_update_data(status):
        if status == "active":
            return {"status": status, "active": True, "deleted_at": None}
        if status == "withdrawn":
            return {"status": status, "active": False, "deleted_at": datetime.now(timezone.utc)}
        return {"status": status, "active": False, "deleted_at": None}

    @staticmethod
    def _review_case_to_dict(review_case):
        hospital = review_case.hospital
        review = review_case.review
        analysis_result = review_case.analysis_result
        report = review_case.review_report

        return {
            "id": review_case.id,
            "caseType": review_case.case_type,
            "status": review_case.status,
            "priority": review_case.priority,
            "reason": review_case.reason,
            "scoreSnapshot": review_case.score_snapshot or {},
            "adminMemo": review_case.admin_memo,
            "assignedAdminMemberId": review_case.assigned_admin_member_id,
            "resolvedAdminMemberId": review_case.resolved_admin_member_id,
            "resolvedAt": AdminService._date_to_str(review_case.resolved_at),
            "createdAt": AdminService._date_to_str(review_case.created_at),
            "updatedAt": AdminService._date_to_str(review_case.updated_at),
            "hospital": {
                "id": hospital.id,
                "hospitalName": hospital.hospital_name,
                "category": hospital.category,
                "region": hospital.region,
                "address": hospital.road_address or hospital.address,
            }
            if hospital
            else None,
            "review": {
                "id": review.id,
                "content": review.review_original,
                "language": review.review_language,
                "sourcePlatform": review.source_platform,
                "createdAt": AdminService._date_to_str(review.created_at),
            }
            if review
            else None,
            "analysisResult": {
                "id": analysis_result.id,
                "totalScore": analysis_result.total_score,
                "trustScore": analysis_result.trust_score,
                "adScore": analysis_result.ad_score,
                "placeScore": analysis_result.place_score,
                "foreignerScore": analysis_result.foreigner_score,
                "trustLevel": analysis_result.trust_level,
                "adSuspicion": analysis_result.ad_suspicion,
                "repetitionSuspicion": analysis_result.repetition_suspicion,
                "summaryKo": analysis_result.summary_ko,
                "summaryEn": analysis_result.summary_en,
                "createdAt": AdminService._date_to_str(analysis_result.created_at),
            }
            if analysis_result
            else None,
            "reviewReport": {
                "id": report.id,
                "reportType": report.report_type,
                "reportReason": report.report_reason,
                "status": report.status,
                "createdAt": AdminService._date_to_str(report.created_at),
            }
            if report
            else None,
        }

    @staticmethod
    def _hospital_to_admin_dict(hospital):
        return {
            "id": hospital.id,
            "hospitalName": hospital.hospital_name,
            "category": hospital.category,
            "region": hospital.region,
            "address": hospital.address,
            "roadAddress": hospital.road_address,
            "latitude": float(hospital.latitude) if hospital.latitude is not None else None,
            "longitude": float(hospital.longitude) if hospital.longitude is not None else None,
            "phone": hospital.phone,
            "naverPlaceUrl": hospital.naver_place_url,
            "naverPlaceId": hospital.naver_place_id,
            "kakaoPlaceUrl": hospital.kakao_place_url,
            "googleMapUrl": hospital.google_map_url,
            "googlePlaceId": hospital.google_place_id,
            "homepageUrl": hospital.homepage_url,
            "englishName": hospital.english_name,
            "hasEnglishInfo": hospital.has_english_info,
            "hasEnglishReviews": hospital.has_english_reviews,
            "hasPhotos": hospital.has_photos,
            "hasGooglePhotos": hospital.has_google_photos,
            "naverRating": float(hospital.naver_rating) if hospital.naver_rating is not None else None,
            "naverReviewCount": hospital.naver_review_count,
            "googleRating": float(hospital.google_rating) if hospital.google_rating is not None else None,
            "googleReviewCount": hospital.google_review_count,
            "adminStatus": hospital.admin_status,
            "adminMemo": hospital.admin_memo,
            "verifiedBy": hospital.verified_by,
            "verifiedAt": AdminService._date_to_str(hospital.verified_at),
            "hiddenBy": hospital.hidden_by,
            "hiddenAt": AdminService._date_to_str(hospital.hidden_at),
            "createdAt": AdminService._date_to_str(hospital.created_at),
            "updatedAt": AdminService._date_to_str(hospital.updated_at),
        }

    @staticmethod
    def _normalize_review_case_type(case_type):
        normalized_case_type = str(case_type or "").lower()
        if normalized_case_type not in AdminService.REVIEW_CASE_TYPES:
            raise ValueError("Invalid review case type")
        return normalized_case_type

    @staticmethod
    def _normalize_review_case_status(status):
        normalized_status = str(status or "").lower()
        if normalized_status not in AdminService.REVIEW_CASE_STATUSES:
            raise ValueError("Invalid review case status")
        return normalized_status

    @staticmethod
    def _normalize_hospital_category(category):
        normalized_category = str(category or "").lower()
        if normalized_category not in AdminService.HOSPITAL_CATEGORIES:
            raise ValueError("Invalid hospital category")
        return normalized_category

    @staticmethod
    def _normalize_hospital_status(status):
        normalized_status = str(status or "").lower()
        if normalized_status not in AdminService.HOSPITAL_STATUSES:
            raise ValueError("Invalid hospital admin status")
        return normalized_status

    @staticmethod
    def _normalize_optional(value, allowed, field_name, uppercase=False):
        if value is None or str(value).strip().lower() == "all":
            return None
        normalized = str(value).strip()
        normalized = normalized.upper() if uppercase else normalized.lower()
        if normalized not in allowed:
            raise ValueError(f"Invalid {field_name}")
        return normalized

    @staticmethod
    def _normalize_period_key(period_key):
        if period_key is None or str(period_key).strip().lower() == "all":
            return None
        normalized = str(period_key).strip()
        try:
            datetime.strptime(normalized, "%Y-%m")
        except ValueError as exc:
            raise ValueError("Invalid period key") from exc
        return normalized

    @staticmethod
    def _hospital_update_data(payload, admin_member_id):
        field_map = {
            "hospitalName": "hospital_name",
            "englishName": "english_name",
            "region": "region",
            "address": "address",
            "roadAddress": "road_address",
            "phone": "phone",
            "adminMemo": "admin_memo",
        }
        url_field_map = {
            "naverPlaceUrl": "naver_place_url",
            "kakaoPlaceUrl": "kakao_place_url",
            "googleMapUrl": "google_map_url",
            "homepageUrl": "homepage_url",
        }
        bool_field_map = {
            "hasEnglishInfo": "has_english_info",
            "hasEnglishReviews": "has_english_reviews",
            "hasPhotos": "has_photos",
            "hasGooglePhotos": "has_google_photos",
        }
        data = {}

        for source_key, target_key in field_map.items():
            if source_key in payload:
                cleaned_value = AdminService._clean_optional_text(payload.get(source_key))
                if source_key == "hospitalName" and not cleaned_value:
                    raise ValueError("Hospital name is required")
                data[target_key] = cleaned_value

        for source_key, target_key in url_field_map.items():
            if source_key in payload:
                data[target_key] = AdminService._validate_optional_http_url(payload.get(source_key), source_key)

        for source_key, target_key in bool_field_map.items():
            if source_key in payload:
                data[target_key] = bool(payload.get(source_key))

        status = payload.get("adminStatus", payload.get("status"))
        if status is not None:
            normalized_status = AdminService._normalize_hospital_status(status)
            data["admin_status"] = normalized_status
            if normalized_status == "hidden":
                data["hidden_by"] = admin_member_id
                data["hidden_at"] = datetime.now(timezone.utc)
            else:
                data["hidden_by"] = None
                data["hidden_at"] = None

        if payload.get("markVerified"):
            data["verified_by"] = admin_member_id
            data["verified_at"] = datetime.now(timezone.utc)

        return data

    @staticmethod
    def _clean_optional_text(value):
        if value is None:
            return None
        cleaned = str(value).strip()
        return cleaned or None

    @staticmethod
    def _validate_optional_http_url(value, field_name):
        cleaned = AdminService._clean_optional_text(value)
        if not cleaned:
            return None

        parsed = urlparse(cleaned)
        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            raise ValueError(f"Invalid {field_name}")
        return cleaned

    @staticmethod
    def _hospital_audit_snapshot(hospital):
        return {
            "hospital_name": hospital.hospital_name,
            "english_name": hospital.english_name,
            "naver_place_url": hospital.naver_place_url,
            "kakao_place_url": hospital.kakao_place_url,
            "google_map_url": hospital.google_map_url,
            "homepage_url": hospital.homepage_url,
            "admin_status": hospital.admin_status,
            "admin_memo": hospital.admin_memo,
            "verified_by": hospital.verified_by,
            "verified_at": AdminService._date_to_str(hospital.verified_at),
            "hidden_by": hospital.hidden_by,
            "hidden_at": AdminService._date_to_str(hospital.hidden_at),
        }

    @staticmethod
    def _date_to_str(value):
        return value.isoformat() if value else None

    @staticmethod
    def _create_audit_log(admin_member_id, action_type, member_id, before, after, target_table="members"):
        AdminRepository.create_audit_log(
            {
                "admin_member_id": admin_member_id,
                "action_type": action_type,
                "target_table": target_table,
                "target_id": member_id,
                "before_json": before,
                "after_json": after,
            }
        )
