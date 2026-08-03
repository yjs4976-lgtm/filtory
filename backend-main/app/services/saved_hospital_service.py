from app.extensions import db
from app.repositories import AnalysisRepository, HospitalRepository, SavedHospitalRepository
from app.schemas import saved_hospital_to_dict


class SavedHospitalService:
    CATEGORIES = {"dermatology", "ophthalmology", "dentistry", "orthopedics"}

    @staticmethod
    def list_favorite_hospitals(member_id, page=1, size=6, category=None, status=None, sort="latest", keyword=None):
        if category and category not in SavedHospitalService.CATEGORIES:
            raise ValueError("Invalid category")
        if status and status not in {"analyzed", "not_analyzed"}:
            raise ValueError("Invalid status")
        if sort not in {"latest", "oldest", "name"}:
            raise ValueError("Invalid sort")
        if page < 1 or size < 1 or size > 50:
            raise ValueError("Invalid pagination")
        keyword = (keyword or "").strip()[:100] or None
        rows = SavedHospitalRepository.list_filtered(member_id, category, status, keyword, sort, size, (page - 1) * size)
        total = SavedHospitalRepository.count_filtered(member_id, category, status, keyword)
        return [saved_hospital_to_dict(saved, result) for saved, result in rows], total

    @staticmethod
    def save_favorite_hospital(member_id, payload):
        hospital_payload = payload.get("hospital")
        if not (payload.get("hospitalId") or payload.get("hospital_id")) and hospital_payload:
            hospital = SavedHospitalService._upsert_external_hospital(hospital_payload)
            payload = {**payload, "hospitalId": hospital.id}
        return SavedHospitalService.save_hospital(member_id, payload)

    @staticmethod
    def _upsert_external_hospital(payload):
        name = str(payload.get("name") or payload.get("hospitalName") or "").strip()
        category = payload.get("category")
        frontend_categories = {"derma": "dermatology", "eye": "ophthalmology", "dental": "dentistry"}
        category = frontend_categories.get(category, category)
        if not name or category not in SavedHospitalService.CATEGORIES:
            raise ValueError("Valid hospital name and category are required")
        external_id = str(payload.get("externalPlaceId") or "").strip() or None
        provider = str(payload.get("provider") or payload.get("sourceProvider") or "external").strip()[:20]
        hospital = HospitalRepository.get_by_source_provider_external_place_id(provider, external_id) if external_id else None
        road_address = str(payload.get("roadAddress") or "").strip() or None
        address = str(payload.get("address") or "").strip() or None
        if not hospital:
            hospital = HospitalRepository.get_by_name_category_address(name, category, road_address or address)
        if hospital:
            return hospital
        map_url = str(payload.get("mapUrl") or "").strip() or None
        hospital = HospitalRepository.create({
            "hospital_name": name, "category": category, "source_provider": provider,
            "external_place_id": external_id, "address": address, "road_address": road_address,
            "phone": str(payload.get("phone") or "").strip() or None,
            "latitude": payload.get("latitude") or payload.get("lat"),
            "longitude": payload.get("longitude") or payload.get("lng"),
            "kakao_place_url": str(payload.get("kakaoPlaceUrl") or (map_url if provider == "kakao" else "")).strip() or None,
            "naver_place_url": str(payload.get("naverPlaceUrl") or (map_url if provider == "naver" else "")).strip() or None,
            "naver_place_id": str(payload.get("naverPlaceId") or "").strip() or None,
            "google_map_url": str(payload.get("googleMapUrl") or (map_url if provider == "google" else "")).strip() or None,
            "google_place_id": str(payload.get("googlePlaceId") or "").strip() or None,
        })
        db.session.flush()
        return hospital
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
        if not HospitalRepository.is_publicly_available(hospital):
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
