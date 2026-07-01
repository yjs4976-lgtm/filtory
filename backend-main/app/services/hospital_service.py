from app.extensions import db
from app.repositories import HospitalRepository
from app.schemas import extract_hospital_data, hospital_to_dict


class HospitalService:
    CATEGORIES = {"dermatology", "ophthalmology", "dentistry"}
    CATEGORY_ALIASES = {
        "derma": "dermatology",
        "skin": "dermatology",
        "피부과": "dermatology",
        "eye": "ophthalmology",
        "안과": "ophthalmology",
        "dental": "dentistry",
        "치과": "dentistry",
    }

    @staticmethod
    def list_hospitals(category=None, region=None, keyword=None, limit=20, offset=0):
        category = HospitalService._normalize_category(category)

        if category and category not in HospitalService.CATEGORIES:
            raise ValueError("Invalid hospital category")

        if keyword:
            hospitals = HospitalRepository.search(keyword, category=category, region=region, limit=limit, offset=offset)
        else:
            hospitals = HospitalRepository.list_by_category(category=category, region=region, limit=limit, offset=offset)

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
        if data.get("category"):
            data["category"] = HospitalService._normalize_category(data["category"])
        HospitalService._validate_hospital_data(data, require_name=True)

        try:
            hospital = HospitalRepository.create(data)
            db.session.commit()
            return hospital_to_dict(hospital)
        except Exception:
            db.session.rollback()
            raise

    @staticmethod
    def get_or_create_hospital_for_analysis(payload):
        hospital_id = payload.get("hospital_id")
        if hospital_id:
            hospital = HospitalRepository.get_by_id(hospital_id)
            if not hospital:
                raise ValueError("Hospital not found")
            return hospital

        category = HospitalService._normalize_category(payload.get("category"))
        if category not in HospitalService.CATEGORIES:
            raise ValueError("Invalid hospital category")

        naver_place_id = payload.get("naver_place_id")
        if naver_place_id:
            hospital = HospitalRepository.get_by_naver_place_id(naver_place_id)
            if hospital:
                return hospital

        google_place_id = payload.get("google_place_id")
        if google_place_id:
            hospital = HospitalRepository.get_by_google_place_id(google_place_id)
            if hospital:
                return hospital

        hospital_name = payload.get("hospital_name")
        if not hospital_name:
            raise ValueError("hospital_name is required")

        hospital = HospitalRepository.get_by_name_category_address(
            hospital_name,
            category,
            payload.get("address"),
        )
        if hospital:
            return hospital

        data = extract_hospital_data(payload)
        data["category"] = category
        HospitalService._validate_hospital_data(data, require_name=True)
        return HospitalRepository.create(data)

    @staticmethod
    def update_hospital(hospital_id, payload):
        hospital = HospitalRepository.get_by_id(hospital_id)
        if not hospital:
            raise ValueError("Hospital not found")

        data = extract_hospital_data(payload)
        if data.get("category"):
            data["category"] = HospitalService._normalize_category(data["category"])
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

    @staticmethod
    def _normalize_category(category):
        if not category:
            return category

        return HospitalService.CATEGORY_ALIASES.get(category, category)
