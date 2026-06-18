from app.extensions import db
from app.repositories import HospitalRepository
from app.schemas import extract_hospital_data, hospital_to_dict


class HospitalService:
    CATEGORIES = {"dermatology", "ophthalmology", "dentistry"}

    @staticmethod
    def list_hospitals(category=None, keyword=None, limit=20, offset=0):
        if category and category not in HospitalService.CATEGORIES:
            raise ValueError("Invalid hospital category")

        if keyword:
            hospitals = HospitalRepository.search(keyword, category=category, limit=limit, offset=offset)
        else:
            hospitals = HospitalRepository.list_by_category(category=category, limit=limit, offset=offset)

        return [hospital_to_dict(hospital) for hospital in hospitals]

    @staticmethod
    def get_hospital(hospital_id):
        hospital = HospitalRepository.get_by_id(hospital_id)
        if not hospital:
            raise ValueError("Hospital not found")
        return hospital_to_dict(hospital)

    @staticmethod
    def create_hospital(payload):
        data = extract_hospital_data(payload)
        HospitalService._validate_hospital_data(data, require_name=True)

        try:
            hospital = HospitalRepository.create(data)
            db.session.commit()
            return hospital_to_dict(hospital)
        except Exception:
            db.session.rollback()
            raise

    @staticmethod
    def update_hospital(hospital_id, payload):
        hospital = HospitalRepository.get_by_id(hospital_id)
        if not hospital:
            raise ValueError("Hospital not found")

        data = extract_hospital_data(payload)
        HospitalService._validate_hospital_data(data)

        try:
            hospital = HospitalRepository.update(hospital, data)
            db.session.commit()
            return hospital_to_dict(hospital)
        except Exception:
            db.session.rollback()
            raise

    @staticmethod
    def _validate_hospital_data(data, require_name=False):
        if require_name and not data.get("hospital_name"):
            raise ValueError("hospital_name is required")

        if require_name and not data.get("category"):
            raise ValueError("category is required")

        if data.get("category") and data["category"] not in HospitalService.CATEGORIES:
            raise ValueError("Invalid hospital category")
