from sqlalchemy import func, or_
from sqlalchemy.orm import joinedload

from app.extensions import db
from app.models import (
    AdminAuditLog,
    AdminReviewModerationCase,
    AnalysisRequest,
    Hospital,
    Member,
    MemberSavedHospital,
    Review,
    ReviewReport,
)


class AdminRepository:
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
        target_filters = []
        if data.get("review_id"):
            target_filters.append(AdminReviewModerationCase.review_id == data["review_id"])
        if data.get("analysis_result_id"):
            target_filters.append(AdminReviewModerationCase.analysis_result_id == data["analysis_result_id"])
        if data.get("review_report_id"):
            target_filters.append(AdminReviewModerationCase.review_report_id == data["review_report_id"])

        if not target_filters:
            return None

        existing = (
            AdminReviewModerationCase.query.filter(
                AdminReviewModerationCase.case_type == data["case_type"],
                AdminReviewModerationCase.status.in_(("pending", "reviewing")),
                or_(*target_filters),
            )
            .first()
        )
        if existing:
            return existing

        review_case = AdminReviewModerationCase(**data)
        db.session.add(review_case)
        return review_case

    @staticmethod
    def get_hospital_by_id(hospital_id):
        return db.session.get(Hospital, hospital_id)

    @staticmethod
    def update_hospital(hospital, data):
        for key, value in data.items():
            setattr(hospital, key, value)
        return hospital
