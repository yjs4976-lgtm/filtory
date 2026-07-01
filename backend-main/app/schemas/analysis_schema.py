def _isoformat(value):
    return value.isoformat() if value else None


ANALYSIS_REQUEST_FIELDS = {
    "member_id",
    "hospital_id",
    "analysis_type",
    "request_status",
    "input_language",
    "output_language",
    "review_count",
    "request_options_json",
    "error_message",
    "started_at",
    "completed_at",
}

ANALYSIS_RESULT_FIELDS = {
    "member_id",
    "hospital_id",
    "review_id",
    "request_id",
    "total_score",
    "trust_score",
    "ad_score",
    "place_score",
    "foreigner_score",
    "trust_level",
    "ad_suspicion",
    "repetition_suspicion",
    "summary_ko",
    "summary_en",
    "evidence_json",
    "ai_model",
}


def analysis_request_to_dict(analysis_request):
    if analysis_request is None:
        return None

    return {
        "id": analysis_request.id,
        "member_id": analysis_request.member_id,
        "hospital_id": analysis_request.hospital_id,
        "analysis_type": analysis_request.analysis_type,
        "request_status": analysis_request.request_status,
        "input_language": analysis_request.input_language,
        "output_language": analysis_request.output_language,
        "review_count": analysis_request.review_count,
        "request_options_json": analysis_request.request_options_json,
        "error_message": analysis_request.error_message,
        "started_at": _isoformat(analysis_request.started_at),
        "completed_at": _isoformat(analysis_request.completed_at),
        "created_at": _isoformat(analysis_request.created_at),
        "updated_at": _isoformat(analysis_request.updated_at),
    }


def analysis_result_to_dict(analysis_result):
    if analysis_result is None:
        return None

    return {
        "id": analysis_result.id,
        "member_id": analysis_result.member_id,
        "hospital_id": analysis_result.hospital_id,
        "review_id": analysis_result.review_id,
        "request_id": analysis_result.request_id,
        "total_score": analysis_result.total_score,
        "trust_score": analysis_result.trust_score,
        "ad_score": analysis_result.ad_score,
        "place_score": analysis_result.place_score,
        "foreigner_score": analysis_result.foreigner_score,
        "trust_level": analysis_result.trust_level,
        "ad_suspicion": analysis_result.ad_suspicion,
        "repetition_suspicion": analysis_result.repetition_suspicion,
        "summary_ko": analysis_result.summary_ko,
        "summary_en": analysis_result.summary_en,
        "evidence_json": analysis_result.evidence_json,
        "ai_model": analysis_result.ai_model,
        "created_at": _isoformat(analysis_result.created_at),
    }


def extract_analysis_request_data(payload):
    return {
        key: payload[key]
        for key in ANALYSIS_REQUEST_FIELDS
        if key in payload
    }


def extract_analysis_result_data(payload):
    return {
        key: payload[key]
        for key in ANALYSIS_RESULT_FIELDS
        if key in payload
    }


def analysis_ai_response_to_result_data(ai_response, member_id, hospital_id, request_id, review_ids, output_language):
    evidence_json = {
        "evidence": ai_response.get("evidence") or {},
        "recommendation": ai_response.get("recommendation"),
        "informationLevel": ai_response.get("informationLevel"),
        "analyzedReviewCount": ai_response.get("analyzedReviewCount"),
        "rawResponse": ai_response,
    }

    data = {
        "member_id": member_id,
        "hospital_id": hospital_id,
        "review_id": review_ids[0] if review_ids else None,
        "request_id": request_id,
        "total_score": _optional_int(ai_response.get("totalScore")),
        "trust_score": _optional_int(ai_response.get("trustScore")),
        "ad_score": _optional_int(ai_response.get("adScore")),
        "place_score": _optional_int(ai_response.get("placeScore")),
        "foreigner_score": _optional_int(ai_response.get("foreignerScore")),
        "trust_level": ai_response.get("trustLevelKey"),
        "ad_suspicion": ai_response.get("adSuspicionLevel"),
        "repetition_suspicion": ai_response.get("repetitionLevel"),
        "evidence_json": evidence_json,
        "ai_model": ai_response.get("modelVersion"),
    }

    if output_language == "en":
        data["summary_en"] = ai_response.get("summary")
    else:
        data["summary_ko"] = ai_response.get("summary")

    return data


def integrated_analysis_to_dict(analysis_request, analysis_result, hospital, reviews, ai_response):
    return {
        "analysisRequestId": analysis_request.id,
        "analysisResultId": analysis_result.id if analysis_result else None,
        "hospitalId": hospital.id,
        "reviewIds": [review.id for review in reviews],
        "result": ai_response,
    }


def _optional_int(value):
    if value is None:
        return None

    try:
        return int(round(float(value)))
    except (TypeError, ValueError):
        return None
