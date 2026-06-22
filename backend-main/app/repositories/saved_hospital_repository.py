from sqlalchemy.orm import joinedload

from app.extensions import db
from app.models import MemberSavedHospital


class SavedHospitalRepository:
    @staticmethod
    def list_by_member(member_id, limit=20, offset=0):
        return (
            MemberSavedHospital.query.options(
                joinedload(MemberSavedHospital.hospital),
                joinedload(MemberSavedHospital.analysis_result),
            )
            .filter(MemberSavedHospital.member_id == member_id)
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
