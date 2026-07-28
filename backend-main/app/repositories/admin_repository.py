from datetime import datetime, time, timezone

from sqlalchemy import String, cast, func, or_
from sqlalchemy.orm import joinedload

from app.extensions import db
from app.models import (
    AdminAuditLog,
    AdminReviewModerationCase,
    AnalysisRequest,
    AnalysisResult,
    AnalysisUsageLog,
    Hospital,
    Inquiry,
    Member,
    MemberSavedHospital,
    Review,
    ReviewReport,
)


class AdminRepository:
    @staticmethod
    def list_analyses(
        keyword=None,
        status=None,
        category=None,
        analysis_type=None,
        errors_only=False,
        limit=20,
        offset=0,
    ):
        query = AnalysisRequest.query

        if keyword:
            pattern = f"%{keyword.strip()}%"
            query = (
                query.outerjoin(Member, AnalysisRequest.member_id == Member.id)
                .join(Hospital, AnalysisRequest.hospital_id == Hospital.id)
                .outerjoin(AnalysisResult, AnalysisResult.request_id == AnalysisRequest.id)
                .filter(
                    or_(
                        Hospital.hospital_name.ilike(pattern),
                        Member.email.ilike(pattern),
                        Member.nickname.ilike(pattern),
                        AnalysisRequest.error_message.ilike(pattern),
                        cast(AnalysisRequest.id, String).ilike(pattern),
                        cast(AnalysisResult.id, String).ilike(pattern),
                    )
                )
            )

        if status:
            query = query.filter(AnalysisRequest.request_status == status)
        if category:
            query = query.join(Hospital, AnalysisRequest.hospital_id == Hospital.id) if not keyword else query
            query = query.filter(Hospital.category == category)
        if analysis_type:
            query = query.filter(AnalysisRequest.analysis_type == analysis_type)
        if errors_only:
            query = query.filter(
                or_(
                    AnalysisRequest.request_status == "failed",
                    AnalysisRequest.error_message.is_not(None),
                )
            )

        total = query.count()
        items = (
            query.options(
                joinedload(AnalysisRequest.member),
                joinedload(AnalysisRequest.hospital),
                joinedload(AnalysisRequest.analysis_result),
            )
            .order_by(AnalysisRequest.created_at.desc(), AnalysisRequest.id.desc())
            .limit(limit)
            .offset(offset)
            .all()
        )
        return items, total

    @staticmethod
    def list_usage_logs(keyword=None, usage_type=None, period_key=None, limit=20, offset=0):
        query = AnalysisUsageLog.query

        if keyword:
            pattern = f"%{keyword.strip()}%"
            query = (
                query.join(Member, AnalysisUsageLog.member_id == Member.id)
                .join(AnalysisResult, AnalysisUsageLog.analysis_result_id == AnalysisResult.id)
                .join(Hospital, AnalysisResult.hospital_id == Hospital.id)
                .filter(
                    or_(
                        Member.email.ilike(pattern),
                        Member.nickname.ilike(pattern),
                        Hospital.hospital_name.ilike(pattern),
                        cast(AnalysisUsageLog.id, String).ilike(pattern),
                    )
                )
            )

        if usage_type:
            query = query.filter(AnalysisUsageLog.usage_type == usage_type)
        if period_key:
            query = query.filter(AnalysisUsageLog.period_key == period_key)

        total = query.count()
        items = (
            query.options(
                joinedload(AnalysisUsageLog.member),
                joinedload(AnalysisUsageLog.analysis_result).joinedload(AnalysisResult.hospital),
            )
            .order_by(AnalysisUsageLog.charged_at.desc(), AnalysisUsageLog.id.desc())
            .limit(limit)
            .offset(offset)
            .all()
        )
        return items, total

    @staticmethod
    def count_analyses(status=None, created_from=None):
        query = db.session.query(func.count(AnalysisRequest.id))
        if status:
            query = query.filter(AnalysisRequest.request_status == status)
        if created_from:
            query = query.filter(AnalysisRequest.created_at >= created_from)
        return query.scalar() or 0

    @staticmethod
    def count_pending_review_cases():
        return (
            db.session.query(func.count(AdminReviewModerationCase.id))
            .filter(AdminReviewModerationCase.status.in_(("pending", "reviewing")))
            .scalar()
            or 0
        )

    @staticmethod
    def count_open_inquiries():
        return (
            db.session.query(func.count(Inquiry.id))
            .filter(Inquiry.status.in_(("PENDING", "IN_PROGRESS")))
            .scalar()
            or 0
        )

    @staticmethod
    def count_hospitals(status=None):
        query = db.session.query(func.count(Hospital.id))
        if status:
            query = query.filter(Hospital.admin_status == status)
        return query.scalar() or 0

    @staticmethod
    def analysis_summary_counts(now=None):
        current = now or datetime.now(timezone.utc)
        today_start = datetime.combine(current.date(), time.min, tzinfo=timezone.utc)
        month_start = datetime(current.year, current.month, 1, tzinfo=timezone.utc)
        return {
            "totalAnalyses": AdminRepository.count_analyses(),
            "todayAnalyses": AdminRepository.count_analyses(created_from=today_start),
            "monthAnalyses": AdminRepository.count_analyses(created_from=month_start),
            "failedAnalyses": AdminRepository.count_analyses(status="failed"),
            "pendingReviewCases": AdminRepository.count_pending_review_cases(),
            "openInquiries": AdminRepository.count_open_inquiries(),
            "totalHospitals": AdminRepository.count_hospitals(),
            "needsReviewHospitals": AdminRepository.count_hospitals(status="needs_review"),
        }

    @staticmethod
    def get_member_by_id(member_id):
        return db.session.get(Member, member_id)

    @staticmethod
    def list_members(keyword=None, status=None, role=None, limit=20, offset=0):
        query = Member.query

        if keyword:
            pattern = f"%{keyword.strip()}%"
            query = query.filter(
                or_(
                    Member.login_id.ilike(pattern),
                    Member.email.ilike(pattern),
                    Member.nickname.ilike(pattern),
                    Member.real_name.ilike(pattern),
                )
            )

        if status:
            query = query.filter(Member.status == status)

        if role:
            query = query.filter(Member.role == role)

        return query.order_by(Member.created_at.desc()).limit(limit).offset(offset).all()

    @staticmethod
    def count_members(status=None):
        query = db.session.query(func.count(Member.id))
        if status:
            query = query.filter(Member.status == status)
        return query.scalar() or 0

    @staticmethod
    def get_member_activity_counts(member_id):
        return {
            "analysis_count": (
                db.session.query(func.count(AnalysisRequest.id))
                .filter(AnalysisRequest.member_id == member_id)
                .scalar()
                or 0
            ),
            "saved_hospital_count": (
                db.session.query(func.count(MemberSavedHospital.id))
                .filter(MemberSavedHospital.member_id == member_id)
                .scalar()
                or 0
            ),
            "report_count": (
                db.session.query(func.count(ReviewReport.id))
                .filter(ReviewReport.reporter_member_id == member_id)
                .scalar()
                or 0
            ),
        }

    @staticmethod
    def update_member(member, data):
        for key, value in data.items():
            setattr(member, key, value)
        return member

    @staticmethod
    def create_audit_log(data):
        audit_log = AdminAuditLog(**data)
        db.session.add(audit_log)
        return audit_log

    @staticmethod
    def list_audit_logs(keyword=None, action=None, resource_type=None, admin_id=None, limit=20, offset=0):
        query = AdminAuditLog.query

        if keyword:
            pattern = f"%{keyword.strip()}%"
            query = (
                query.outerjoin(Member, AdminAuditLog.admin_member_id == Member.id)
                .filter(
                    or_(
                        Member.email.ilike(pattern),
                        Member.nickname.ilike(pattern),
                        AdminAuditLog.action_type.ilike(pattern),
                        AdminAuditLog.target_table.ilike(pattern),
                        AdminAuditLog.description.ilike(pattern),
                        cast(AdminAuditLog.id, String).ilike(pattern),
                        cast(AdminAuditLog.target_id, String).ilike(pattern),
                    )
                )
            )

        if action:
            query = query.filter(AdminAuditLog.action_type == action)
        if resource_type:
            query = query.filter(AdminAuditLog.target_table == resource_type)
        if admin_id is not None:
            query = query.filter(AdminAuditLog.admin_member_id == admin_id)

        total = query.count()
        items = (
            query.options(joinedload(AdminAuditLog.admin_member))
            .order_by(AdminAuditLog.created_at.desc(), AdminAuditLog.id.desc())
            .limit(limit)
            .offset(offset)
            .all()
        )
        return items, total

    @staticmethod
    def get_review_case_by_id(case_id):
        return db.session.get(AdminReviewModerationCase, case_id)

    @staticmethod
    def list_review_cases(keyword=None, status=None, case_type=None, limit=20, offset=0):
        query = AdminRepository._review_cases_query(keyword=keyword, status=status, case_type=case_type)
        total = query.count()
        items = (
            query.options(
                joinedload(AdminReviewModerationCase.hospital),
                joinedload(AdminReviewModerationCase.review),
                joinedload(AdminReviewModerationCase.analysis_result),
                joinedload(AdminReviewModerationCase.review_report),
            )
            .order_by(
                AdminReviewModerationCase.status.asc(),
                AdminReviewModerationCase.created_at.desc(),
            )
            .limit(limit)
            .offset(offset)
            .all()
        )
        return items, total

    @staticmethod
    def _review_cases_query(keyword=None, status=None, case_type=None):
        query = AdminReviewModerationCase.query

        if status:
            query = query.filter(AdminReviewModerationCase.status == status)

        if case_type:
            query = query.filter(AdminReviewModerationCase.case_type == case_type)

        if keyword:
            pattern = f"%{keyword.strip()}%"
            query = (
                query.outerjoin(Hospital, AdminReviewModerationCase.hospital_id == Hospital.id)
                .outerjoin(Review, AdminReviewModerationCase.review_id == Review.id)
                .outerjoin(ReviewReport, AdminReviewModerationCase.review_report_id == ReviewReport.id)
                .filter(
                    or_(
                        Hospital.hospital_name.ilike(pattern),
                        Hospital.region.ilike(pattern),
                        Review.review_original.ilike(pattern),
                        ReviewReport.report_reason.ilike(pattern),
                        AdminReviewModerationCase.reason.ilike(pattern),
                    )
                )
            )

        return query

    @staticmethod
    def list_hospitals(keyword=None, category=None, status=None, limit=20, offset=0):
        query = AdminRepository._hospitals_query(keyword=keyword, category=category, status=status)
        total = query.count()
        items = query.order_by(Hospital.updated_at.desc(), Hospital.id.desc()).limit(limit).offset(offset).all()
        return items, total

    @staticmethod
    def _hospitals_query(keyword=None, category=None, status=None):
        query = Hospital.query

        if keyword:
            pattern = f"%{keyword.strip()}%"
            query = query.filter(
                or_(
                    Hospital.hospital_name.ilike(pattern),
                    Hospital.english_name.ilike(pattern),
                    Hospital.region.ilike(pattern),
                    Hospital.address.ilike(pattern),
                    Hospital.road_address.ilike(pattern),
                    Hospital.naver_place_url.ilike(pattern),
                    Hospital.kakao_place_url.ilike(pattern),
                    Hospital.google_map_url.ilike(pattern),
                    Hospital.homepage_url.ilike(pattern),
                )
            )

        if category:
            query = query.filter(Hospital.category == category)

        if status:
            query = query.filter(Hospital.admin_status == status)

        return query

    @staticmethod
    def update_review_case(review_case, data):
        for key, value in data.items():
            setattr(review_case, key, value)
        return review_case

    @staticmethod
    def create_review_case_if_absent(data):
        dedupe_source = AdminRepository._review_case_dedupe_source(data)
        if not dedupe_source:
            return None

        source_field, source_value = dedupe_source
        query = AdminReviewModerationCase.query.filter(
            AdminReviewModerationCase.case_type == data["case_type"],
            AdminReviewModerationCase.status.in_(("pending", "reviewing")),
        )

        if source_field == "review_report_id":
            query = query.filter(AdminReviewModerationCase.review_report_id == source_value)
        elif source_field == "analysis_result_id":
            query = query.filter(
                AdminReviewModerationCase.analysis_result_id == source_value,
                AdminReviewModerationCase.review_report_id.is_(None),
            )
        elif source_field == "review_id":
            query = query.filter(
                AdminReviewModerationCase.review_id == source_value,
                AdminReviewModerationCase.review_report_id.is_(None),
            )

        existing = query.first()
        if existing:
            return existing

        review_case = AdminReviewModerationCase(**data)
        db.session.add(review_case)
        return review_case

    @staticmethod
    def _review_case_dedupe_source(data):
        if data.get("review_report_id"):
            return "review_report_id", data["review_report_id"]
        if data.get("analysis_result_id"):
            return "analysis_result_id", data["analysis_result_id"]
        if data.get("review_id"):
            return "review_id", data["review_id"]
        return None

    @staticmethod
    def get_hospital_by_id(hospital_id):
        return db.session.get(Hospital, hospital_id)

    @staticmethod
    def update_hospital(hospital, data):
        for key, value in data.items():
            setattr(hospital, key, value)
        return hospital
