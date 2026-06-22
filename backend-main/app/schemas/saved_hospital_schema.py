BACKEND_TO_FRONTEND_CATEGORY = {
    "dermatology": "derma",
    "ophthalmology": "eye",
    "dentistry": "dental",
}


def _isoformat(value):
    return value.isoformat() if value else None


def saved_hospital_to_dict(saved_hospital):
    hospital = saved_hospital.hospital
    analysis_result = saved_hospital.analysis_result
    foreigner_score = analysis_result.foreigner_score if analysis_result else None

    return {
        "id": saved_hospital.hospital_id,
        "savedHospitalId": saved_hospital.id,
        "hospitalName": hospital.hospital_name,
        "category": BACKEND_TO_FRONTEND_CATEGORY.get(hospital.category, hospital.category),
        "address": hospital.address or "",
        "trustScore": analysis_result.trust_score if analysis_result and analysis_result.trust_score is not None else 0,
        "trustLevel": analysis_result.trust_level if analysis_result and analysis_result.trust_level else "",
        "adSuspicionScore": analysis_result.ad_score if analysis_result and analysis_result.ad_score is not None else 0,
        "adSuspicionLevel": analysis_result.ad_suspicion if analysis_result and analysis_result.ad_suspicion else "",
        "infoCompletenessScore": analysis_result.place_score if analysis_result and analysis_result.place_score is not None else 0,
        "globalAccessRating": round(foreigner_score / 20) if foreigner_score is not None else 0,
        "savedAt": _isoformat(saved_hospital.saved_at),
        "lastAnalyzedAt": _isoformat(analysis_result.created_at) if analysis_result else None,
    }
