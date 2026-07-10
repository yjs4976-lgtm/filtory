from sqlalchemy import func

from app.extensions import db
from app.models import AnalysisResult, Hospital, MemberRecentViewedHospital, MemberSavedHospital


class RecentHospitalRepository:
    @staticmethod
    def list_by_member(member_id, limit=20, offset=0):
        latest_result_id = (
            db.session.query(func.max(AnalysisResult.id))
            .filter(AnalysisResult.member_id == member_id, AnalysisResult.hospital_id == MemberRecentViewedHospital.hospital_id)
            .correlate(MemberRecentViewedHospital).scalar_subquery()
        )
        return (
            db.session.query(MemberRecentViewedHospital, Hospital, AnalysisResult, MemberSavedHospital.id)
            .join(Hospital, Hospital.id == MemberRecentViewedHospital.hospital_id)
            .outerjoin(AnalysisResult, AnalysisResult.id == latest_result_id)
            .outerjoin(MemberSavedHospital, (MemberSavedHospital.member_id == member_id) & (MemberSavedHospital.hospital_id == Hospital.id))
            .filter(MemberRecentViewedHospital.member_id == member_id, Hospital.admin_status == "active")
            .order_by(MemberRecentViewedHospital.viewed_at.desc())
            .limit(limit).offset(offset).all()
        )

    @staticmethod
    def count_by_member(member_id):
        return (MemberRecentViewedHospital.query.join(Hospital).filter(
            MemberRecentViewedHospital.member_id == member_id, Hospital.admin_status == "active"
        ).count())

    @staticmethod
    def get(member_id, hospital_id):
        return MemberRecentViewedHospital.query.filter_by(member_id=member_id, hospital_id=hospital_id).first()

    @staticmethod
    def delete(item):
        db.session.delete(item)
