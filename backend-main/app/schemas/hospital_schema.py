def _isoformat(value):
    return value.isoformat() if value else None


def _decimal_to_float(value):
    return float(value) if value is not None else None


HOSPITAL_FIELDS = {
    "hospital_name",
    "category",
    "region",
    "naver_place_url",
    "naver_place_id",
    "source_provider",
    "external_place_id",
    "kakao_place_url",
    "google_map_url",
    "google_place_id",
    "address",
    "road_address",
    "latitude",
    "longitude",
    "phone",
    "homepage_url",
    "description",
    "treatment_items",
    "has_photos",
    "has_videos",
    "has_reservation_link",
    "google_registered",
    "english_name",
    "has_english_info",
    "has_english_reviews",
    "operating_hours",
    "reservation_url",
    "naver_rating",
    "naver_review_count",
    "google_rating",
    "google_review_count",
    "has_google_photos",
    "is_official_hospital",
    "official_source",
}


def hospital_to_dict(hospital):
    if hospital is None:
        return None

    return {
        "id": hospital.id,
        "hospital_name": hospital.hospital_name,
        "category": hospital.category,
        "region": hospital.region,
        "naver_place_url": hospital.naver_place_url,
        "naver_place_id": hospital.naver_place_id,
        "source_provider": hospital.source_provider,
        "external_place_id": hospital.external_place_id,
        "kakao_place_url": hospital.kakao_place_url,
        "google_map_url": hospital.google_map_url,
        "google_place_id": hospital.google_place_id,
        "address": hospital.address,
        "road_address": hospital.road_address,
        "latitude": _decimal_to_float(hospital.latitude),
        "longitude": _decimal_to_float(hospital.longitude),
        "phone": hospital.phone,
        "homepage_url": hospital.homepage_url,
        "description": hospital.description,
        "treatment_items": hospital.treatment_items,
        "has_photos": hospital.has_photos,
        "has_videos": hospital.has_videos,
        "has_reservation_link": hospital.has_reservation_link,
        "google_registered": hospital.google_registered,
        "english_name": hospital.english_name,
        "has_english_info": hospital.has_english_info,
        "has_english_reviews": hospital.has_english_reviews,
        "operating_hours": hospital.operating_hours,
        "reservation_url": hospital.reservation_url,
        "naver_rating": _decimal_to_float(hospital.naver_rating),
        "naver_review_count": hospital.naver_review_count,
        "google_rating": _decimal_to_float(hospital.google_rating),
        "google_review_count": hospital.google_review_count,
        "has_google_photos": hospital.has_google_photos,
        "is_official_hospital": hospital.is_official_hospital,
        "official_source": hospital.official_source,
        "created_at": _isoformat(hospital.created_at),
        "updated_at": _isoformat(hospital.updated_at),
    }


def extract_hospital_data(payload):
    return {
        key: payload[key]
        for key in HOSPITAL_FIELDS
        if key in payload
    }
