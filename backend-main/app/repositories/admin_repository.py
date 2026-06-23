from sqlalchemy import func, or_

from app.extensions import db
from app.models import (
    AdminAuditLog,
    AnalysisRequest,
    Member,
    MemberSavedHospital,
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
