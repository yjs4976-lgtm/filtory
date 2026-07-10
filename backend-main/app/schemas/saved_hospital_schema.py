BACKEND_TO_FRONTEND_CATEGORY = {
    "dermatology": "derma",
    "ophthalmology": "eye",
    "dentistry": "dental",
    "orthopedics": "orthopedics",
}


def _isoformat(value):
    return value.isoformat() if value else None


def saved_hospital_to_dict(saved_hospital, latest_analysis_result=None):
    hospital = saved_hospital.hospital
    analysis_result = latest_analysis_result or saved_hospital.analysis_result
    foreigner_score = analysis_result.foreigner_score if analysis_result else None
    place_score = analysis_result.place_score if analysis_result else None

    return {
        "id": saved_hospital.hospital_id,
        "savedHospitalId": saved_hospital.id,
        "hospitalName": hospital.hospital_name,
        "category": BACKEND_TO_FRONTEND_CATEGORY.get(hospital.category, hospital.category),
        "address": hospital.address or "",
        "roadAddress": hospital.road_address or "",
        "phone": hospital.phone or "",
        "mapUrl": hospital.kakao_place_url or hospital.naver_place_url or hospital.google_map_url or "",
        "externalPlaceId": hospital.external_place_id or hospital.naver_place_id or hospital.google_place_id,
        "sourceProvider": hospital.source_provider or "filtory",
        "isFavorite": True,
        "isAnalyzed": bool(analysis_result),
        "analysisResultId": analysis_result.id if analysis_result else None,
        "trustScore": analysis_result.trust_score if analysis_result and analysis_result.trust_score is not None else 0,
        "trustLevelKey": analysis_result.trust_level if analysis_result and analysis_result.trust_level else "",
        "trustLevel": analysis_result.trust_level if analysis_result and analysis_result.trust_level else "",
        "adSuspicionScore": analysis_result.ad_score if analysis_result and analysis_result.ad_score is not None else 0,
        "adSuspicionLevel": analysis_result.ad_suspicion if analysis_result and analysis_result.ad_suspicion else "",
        "informationScore": place_score if place_score is not None else 0,
        "infoCompletenessScore": analysis_result.place_score if analysis_result and analysis_result.place_score is not None else 0,
        "globalAccessibilityScore": foreigner_score if foreigner_score is not None else 0,
        "globalAccessRating": round(foreigner_score / 20) if foreigner_score is not None else 0,
        "savedAt": _isoformat(saved_hospital.saved_at),
        "lastAnalyzedAt": _isoformat(analysis_result.created_at) if analysis_result else None,
    }
