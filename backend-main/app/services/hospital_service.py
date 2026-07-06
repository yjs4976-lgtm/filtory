from app.extensions import db
from app.repositories import HospitalRepository
from app.schemas import extract_hospital_data, hospital_to_dict
from app.services.hospital_search_provider import HospitalSearchProvider


class HospitalService:
    # 병원 검색/저장/분석용 병원 식별을 담당한다.
    # 외부 검색 결과를 바로 믿지 않고 기존 DB 병원과 매칭한 뒤, 없을 때만 새 병원을 만든다.
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
        # 검색 결과는 외부 provider 결과를 우선 가져오고, DB에 저장된 병원 정보를 보충해서 중복 제거한다.
        # 프론트는 provider 차이를 몰라도 같은 HospitalItem 형태로 받는다.
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
        # 분석 요청에서 선택된 병원을 찾는 순서:
        # 1. 내부 hospital_id
        # 2. 네이버/구글/외부 provider 고유 id
        # 3. 병원명+카테고리+주소
        # 4. 없으면 분석용 병원 row 생성
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
        # 사용자가 분석 단계에서 보강한 영어명/사진 여부 같은 제안성 정보는 바로 hospitals 원본에 쓰지 않는다.
        # 검증 전 정보는 별도 enrichment suggestion 흐름에서 다룬다.
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
        # 같은 병원이 네이버/카카오/DB에서 함께 오면 병원명+주소 기준으로 하나의 카드로 합친다.
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
        # 리뷰 확인 UX를 위해 네이버 결과를 우선 노출하고, 부족하면 Filtory DB와 카카오 결과를 보조로 보여준다.
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
