from sqlalchemy import func, or_
from sqlalchemy.orm import joinedload

from app.extensions import db
from app.models import AnalysisResult, Hospital, MemberSavedHospital


class SavedHospitalRepository:
    @staticmethod
    def filtered_query(member_id, category=None, status=None, keyword=None):
        latest_result_id = (
            db.session.query(func.max(AnalysisResult.id))
            .filter(
                AnalysisResult.member_id == member_id,
                AnalysisResult.hospital_id == MemberSavedHospital.hospital_id,
            )
            .correlate(MemberSavedHospital)
            .scalar_subquery()
        )
        query = (
            db.session.query(MemberSavedHospital, AnalysisResult)
            .join(Hospital, MemberSavedHospital.hospital_id == Hospital.id)
            .outerjoin(AnalysisResult, AnalysisResult.id == latest_result_id)
            .options(joinedload(MemberSavedHospital.hospital))
            .filter(MemberSavedHospital.member_id == member_id, Hospital.admin_status == "active")
        )
        if category:
            query = query.filter(Hospital.category == category)
        if status == "analyzed":
            query = query.filter(AnalysisResult.id.is_not(None))
        elif status == "not_analyzed":
            query = query.filter(AnalysisResult.id.is_(None))
        if keyword:
            pattern = f"%{keyword}%"
            query = query.filter(or_(Hospital.hospital_name.ilike(pattern), Hospital.english_name.ilike(pattern)))
        return query

    @staticmethod
    def list_filtered(member_id, category=None, status=None, keyword=None, sort="latest", limit=6, offset=0):
        query = SavedHospitalRepository.filtered_query(member_id, category, status, keyword)
        if sort == "oldest":
            query = query.order_by(MemberSavedHospital.saved_at.asc())
        elif sort == "name":
            query = query.order_by(Hospital.hospital_name.asc())
        else:
            query = query.order_by(MemberSavedHospital.saved_at.desc())
        return query.limit(limit).offset(offset).all()

    @staticmethod
    def count_filtered(member_id, category=None, status=None, keyword=None):
        return SavedHospitalRepository.filtered_query(member_id, category, status, keyword).count()
    @staticmethod
    def list_by_member(member_id, limit=20, offset=0):
        return (
            MemberSavedHospital.query.options(
                joinedload(MemberSavedHospital.hospital),
                joinedload(MemberSavedHospital.analysis_result),
            )
            .filter(MemberSavedHospital.member_id == member_id)
            .join(Hospital, MemberSavedHospital.hospital_id == Hospital.id)
            .filter(Hospital.admin_status == "active")
            .order_by(MemberSavedHospital.saved_at.desc())
            .limit(limit)
            .offset(offset)
            .all()
        )

    @staticmethod
    def get_by_member_and_hospital(member_id, hospital_id):
        return (
            MemberSavedHospital.query.filter(
                MemberSavedHospital.member_id == member_id,
                MemberSavedHospital.hospital_id == hospital_id,
            )
            .first()
        )

    @staticmethod
    def create(data):
        saved_hospital = MemberSavedHospital(**data)
        db.session.add(saved_hospital)
        return saved_hospital

    @staticmethod
    def delete(saved_hospital):
        db.session.delete(saved_hospital)
