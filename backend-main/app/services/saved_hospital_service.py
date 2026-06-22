from app.extensions import db
from app.repositories import AnalysisRepository, HospitalRepository, SavedHospitalRepository
from app.schemas import saved_hospital_to_dict


class SavedHospitalService:
    @staticmethod
    def list_saved_hospitals(member_id, limit=20, offset=0):
        saved_hospitals = SavedHospitalRepository.list_by_member(member_id, limit=limit, offset=offset)
        return [saved_hospital_to_dict(saved_hospital) for saved_hospital in saved_hospitals]

    @staticmethod
    def save_hospital(member_id, payload):
        hospital_id = payload.get("hospital_id") or payload.get("hospitalId")
        analysis_result_id = payload.get("analysis_result_id") or payload.get("analysisResultId")

        if not hospital_id:
            raise ValueError("hospital_id is required")

        hospital = HospitalRepository.get_by_id(hospital_id)
        if not hospital:
            raise ValueError("Hospital not found")

        existing = SavedHospitalRepository.get_by_member_and_hospital(member_id, hospital_id)
        analysis_result = SavedHospitalService._get_valid_analysis_result(
            member_id,
            hospital_id,
            analysis_result_id,
        )

        try:
            if existing:
                if analysis_result:
                    existing.analysis_result_id = analysis_result.id
                db.session.commit()
                return saved_hospital_to_dict(existing)

            saved_hospital = SavedHospitalRepository.create(
                {
                    "member_id": member_id,
                    "hospital_id": hospital_id,
                    "analysis_result_id": analysis_result.id if analysis_result else None,
                }
            )
            db.session.commit()
            return saved_hospital_to_dict(saved_hospital)
        except Exception:
            db.session.rollback()
            raise

    @staticmethod
    def delete_saved_hospital(member_id, hospital_id):
        saved_hospital = SavedHospitalRepository.get_by_member_and_hospital(member_id, hospital_id)
        if not saved_hospital:
            raise ValueError("Saved hospital not found")

        try:
            SavedHospitalRepository.delete(saved_hospital)
            db.session.commit()
            return {"hospital_id": hospital_id}
        except Exception:
            db.session.rollback()
            raise

    @staticmethod
    def _get_valid_analysis_result(member_id, hospital_id, analysis_result_id):
        if not analysis_result_id:
            return None

        analysis_result = AnalysisRepository.get_result_by_id(analysis_result_id)
        if not analysis_result:
            raise ValueError("Analysis result not found")
        if analysis_result.member_id != member_id or analysis_result.hospital_id != hospital_id:
            raise ValueError("Analysis result does not belong to this member and hospital")
        return analysis_result
