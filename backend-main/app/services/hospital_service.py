from app.extensions import db
from app.repositories import HospitalRepository
from app.schemas import extract_hospital_data, hospital_to_dict
from app.services.hospital_search_provider import HospitalSearchProvider


class HospitalService:
    CATEGORIES = {"dermatology", "ophthalmology", "dentistry"}
    USER_ENRICHMENT_FIELDS = {
        "homepage_url",
        "english_name",
        "has_english_info",
        "has_english_reviews",
        "has_photos",
    }
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
    def search_hospitals(category=None, region=None, keyword=None, limit=20):
        category = HospitalService._normalize_category(category)

        if category and category not in HospitalService.CATEGORIES:
            raise ValueError("Invalid hospital category")

        local_hospitals = HospitalRepository.search(
            keyword or "",
            category=category,
            region=region,
            limit=limit,
            offset=0,
        )
        local_results = [
            {
                **hospital_to_dict(hospital),
                "provider": hospital.source_provider or "filtory",
                "source_provider": hospital.source_provider or "filtory",
                "source_name": "Filtory",
                "source_url": hospital.kakao_place_url or hospital.naver_place_url or hospital.google_map_url,
                "map_url": hospital.kakao_place_url or hospital.naver_place_url or hospital.google_map_url,
            }
            for hospital in local_hospitals
        ]

        external_results = HospitalSearchProvider.search(
            keyword=keyword or "",
            category=category,
            region=region,
            limit=limit,
        )
        results = HospitalService._prioritize_search_results([*external_results, *local_results])
        return HospitalService._dedupe_search_results(results)[:limit]

    @staticmethod
    def get_hospital(hospital_id):
        hospital = HospitalRepository.get_by_id(hospital_id)
        if not HospitalRepository.is_publicly_available(hospital):
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
            if not HospitalRepository.is_publicly_available(hospital):
                raise ValueError("Hospital not found")
            return hospital

        category = HospitalService._normalize_category(payload.get("category"))
        if category not in HospitalService.CATEGORIES:
            raise ValueError("Invalid hospital category")

        naver_place_id = payload.get("naver_place_id")
        if naver_place_id:
            hospital = HospitalRepository.get_by_naver_place_id(naver_place_id)
            if hospital:
                HospitalService._ensure_public_hospital(hospital)
                return hospital

        google_place_id = payload.get("google_place_id")
        if google_place_id:
            hospital = HospitalRepository.get_by_google_place_id(google_place_id)
            if hospital:
                HospitalService._ensure_public_hospital(hospital)
                return hospital

        source_provider = payload.get("source_provider")
        external_place_id = payload.get("external_place_id")
        if source_provider and external_place_id:
            hospital = HospitalRepository.get_by_source_provider_external_place_id(
                source_provider,
                external_place_id,
            )
            if hospital:
                HospitalService._ensure_public_hospital(hospital)
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
            HospitalService._ensure_public_hospital(hospital)
            return hospital

        data = HospitalService._analysis_hospital_data(payload)
        data["category"] = category
        HospitalService._validate_hospital_data(data, require_name=True)
        return HospitalRepository.create(data)

    @staticmethod
    def _analysis_hospital_data(payload):
        data = extract_hospital_data(payload)
        return {
            key: value
            for key, value in data.items()
            if key not in HospitalService.USER_ENRICHMENT_FIELDS
        }

    @staticmethod
    def update_hospital(hospital_id, payload):
        hospital = HospitalRepository.get_by_id(hospital_id)
        if not HospitalRepository.is_publicly_available(hospital):
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
    def _ensure_public_hospital(hospital):
        if not HospitalRepository.is_publicly_available(hospital):
            raise ValueError("Hospital not found")

    @staticmethod
    def _normalize_category(category):
        if not category:
            return category

        return HospitalService.CATEGORY_ALIASES.get(category, category)

    @staticmethod
    def _dedupe_search_results(items):
        results = []
        result_index_by_key = {}
        seen = set()
        for item in items:
            key = (
                str(item.get("hospital_name") or "").strip().lower(),
                str(item.get("road_address") or item.get("address") or "").strip().lower(),
            )
            if key in seen:
                index = result_index_by_key[key]
                results[index] = HospitalService._merge_search_result(results[index], item)
                continue
            seen.add(key)
            result_index_by_key[key] = len(results)
            results.append(item)
        return results

    @staticmethod
    def _merge_search_result(primary, secondary):
        merged = dict(secondary)
        merged.update(
            {
                key: value
                for key, value in primary.items()
                if value not in (None, "", [], {})
            }
        )
        return merged

    @staticmethod
    def _prioritize_search_results(items):
        priority = {
            "naver": 0,
            "filtory": 1,
            "kakao": 2,
            "google": 3,
            "hira": 4,
        }

        def provider_rank(item):
            provider = str(item.get("source_provider") or item.get("provider") or "").strip().lower()
            return priority.get(provider, 9)

        return sorted(items, key=provider_rank)
