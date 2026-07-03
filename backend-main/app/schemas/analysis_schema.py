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
    "deleted_at",
    "deleted_by",
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
        "deleted_at": _isoformat(analysis_request.deleted_at),
        "deleted_by": analysis_request.deleted_by,
        "created_at": _isoformat(analysis_request.created_at),
        "updated_at": _isoformat(analysis_request.updated_at),
    }


def analysis_result_to_dict(analysis_result):
    if analysis_result is None:
        return None

    return {
        **analysis_result_to_canonical_dict(analysis_result),
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


def analysis_result_to_canonical_dict(analysis_result):
    if analysis_result is None:
        return {}

    evidence_json = analysis_result.evidence_json if isinstance(analysis_result.evidence_json, dict) else {}
    raw_response = evidence_json.get("rawResponse")
    raw = raw_response if isinstance(raw_response, dict) else {}
    evidence = raw.get("evidence") if isinstance(raw.get("evidence"), dict) else evidence_json.get("evidence")
    evidence = evidence if isinstance(evidence, dict) else {}
    global_accessibility_checks = raw.get("globalAccessibilityChecks")
    summary = analysis_result.summary_ko or analysis_result.summary_en or raw.get("summary") or ""

    return {
        "totalScore": _first_present(raw.get("totalScore"), analysis_result.total_score),
        "trustScore": _first_present(raw.get("trustScore"), analysis_result.trust_score),
        "trustGrade": raw.get("trustGrade") or raw.get("grade") or "",
        "trustLevelKey": _first_present(raw.get("trustLevelKey"), analysis_result.trust_level),
        "adSuspicionScore": _first_present(raw.get("adSuspicionScore"), raw.get("adScore"), analysis_result.ad_score),
        "adSuspicionLevel": _first_present(raw.get("adSuspicionLevel"), analysis_result.ad_suspicion),
        "informationScore": _first_present(raw.get("informationScore"), raw.get("placeScore"), analysis_result.place_score),
        "informationLevel": _first_present(raw.get("informationLevel"), evidence_json.get("informationLevel")),
        "reviewInformationScore": _first_present(
            raw.get("reviewInformationScore"),
            evidence_json.get("reviewInformationScore"),
        ),
        "reviewInformationLevel": _first_present(
            raw.get("reviewInformationLevel"),
            evidence_json.get("reviewInformationLevel"),
        ),
        "globalAccessibilityScore": _first_present(
            raw.get("globalAccessibilityScore"),
            raw.get("foreignerScore"),
            analysis_result.foreigner_score,
        ),
        "globalAccessibilityLevel": raw.get("globalAccessibilityLevel"),
        "globalAccessibilityMaxScore": _first_present(raw.get("globalAccessibilityMaxScore"), 100),
        "globalAccessibilityChecks": global_accessibility_checks if isinstance(global_accessibility_checks, dict) else {},
        "detectedPatterns": _string_list(raw.get("detectedPatterns")),
        "suspiciousPhrases": _string_list(raw.get("suspiciousPhrases")),
        "repetitivePhrases": _string_list(raw.get("repetitivePhrases")),
        "positiveSignals": _string_list(raw.get("positiveSignals")),
        "negativeSignals": _string_list(raw.get("negativeSignals")),
        "warningSignals": _string_list(raw.get("warningSignals") or evidence.get("warnings")),
        "specificPhrases": _string_list(evidence.get("specificPhrases")),
        "checkItems": _string_list(evidence.get("checkItems")),
        "analyzedReviewCount": _first_present(raw.get("analyzedReviewCount"), evidence_json.get("analyzedReviewCount")),
        "evidence": evidence,
        "summary": summary,
        "recommendation": raw.get("recommendation") or evidence_json.get("recommendation") or "",
        "visitTip": raw.get("visitTip") or "",
        "modelVersion": raw.get("modelVersion") or analysis_result.ai_model or "",
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
    ad_suspicion_score = _first_present(ai_response.get("adSuspicionScore"), ai_response.get("adScore"))
    place_score = _first_present(ai_response.get("placeScore"), ai_response.get("informationScore"))
    global_accessibility_score = _first_present(
        ai_response.get("foreignerScore"),
        ai_response.get("globalAccessibilityScore"),
    )
    evidence_json = {
        "evidence": ai_response.get("evidence") or {},
        "recommendation": ai_response.get("recommendation"),
        "visitTip": ai_response.get("visitTip"),
        "informationLevel": ai_response.get("informationLevel"),
        "reviewInformationScore": ai_response.get("reviewInformationScore"),
        "reviewInformationLevel": ai_response.get("reviewInformationLevel"),
        "globalAccessibilityLevel": ai_response.get("globalAccessibilityLevel"),
        "detectedPatterns": ai_response.get("detectedPatterns") or [],
        "suspiciousPhrases": ai_response.get("suspiciousPhrases") or [],
        "repetitivePhrases": ai_response.get("repetitivePhrases") or [],
        "positiveSignals": ai_response.get("positiveSignals") or [],
        "negativeSignals": ai_response.get("negativeSignals") or [],
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
        "ad_score": _optional_int(ad_suspicion_score),
        "place_score": _optional_int(place_score),
        "foreigner_score": _optional_int(global_accessibility_score),
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


def _first_present(*values):
    for value in values:
        if value is not None:
            return value
    return None


def _string_list(value):
    if not isinstance(value, list):
        return []
    return [str(item) for item in value]
