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

    # DB 컬럼명(snake_case)과 프론트가 기대하는 canonical camelCase 응답을 함께 내려준다.
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

    # evidence_json.rawResponse에는 backend-ai의 원래 응답을 보존한다.
    # 새 필드는 rawResponse에서 우선 읽고, 없으면 실제 DB 컬럼으로 fallback한다.
    evidence_json = analysis_result.evidence_json if isinstance(analysis_result.evidence_json, dict) else {}
    raw_response = evidence_json.get("rawResponse")
    raw = raw_response if isinstance(raw_response, dict) else {}
    score_breakdown = raw.get("scoreBreakdown")
    if not isinstance(score_breakdown, dict):
        score_breakdown = raw.get("score_breakdown")
    score_breakdown = score_breakdown if isinstance(score_breakdown, dict) else {}
    evidence = raw.get("evidence") if isinstance(raw.get("evidence"), dict) else evidence_json.get("evidence")
    evidence = evidence if isinstance(evidence, dict) else {}
    global_accessibility_checks = raw.get("globalAccessibilityChecks")
    summary = analysis_result.summary_ko or analysis_result.summary_en or raw.get("summary") or ""

    return {
        "totalScore": _first_present(raw.get("totalScore"), analysis_result.total_score),
        "trustScore": _first_present(raw.get("trustScore"), analysis_result.trust_score),
        "reviewTrustScore": _first_present(raw.get("reviewTrustScore"), raw.get("trustScore"), analysis_result.trust_score),
        "evidenceScore": _score_breakdown_value(raw, score_breakdown, "evidenceScore", "evidence_score"),
        "riskScore": _score_breakdown_value(raw, score_breakdown, "riskScore", "risk_score"),
        "specificityScore": _score_breakdown_value(raw, score_breakdown, "specificityScore", "specificity_score"),
        "balanceScore": _score_breakdown_value(raw, score_breakdown, "balanceScore", "balance_score"),
        "diversityScore": _score_breakdown_value(raw, score_breakdown, "diversityScore", "diversity_score"),
        "informativeScore": _score_breakdown_value(raw, score_breakdown, "informativeScore", "informative_score"),
        "naturalnessScore": _score_breakdown_value(raw, score_breakdown, "naturalnessScore", "naturalness_score"),
        "promoSignalScore": _score_breakdown_value(raw, score_breakdown, "promoSignalScore", "promo_signal_score"),
        "repetitionScore": _score_breakdown_value(raw, score_breakdown, "repetitionScore", "repetition_score"),
        "exaggerationScore": _score_breakdown_value(raw, score_breakdown, "exaggerationScore", "exaggeration_score"),
        "eventDiscountScore": _score_breakdown_value(raw, score_breakdown, "eventDiscountScore", "event_discount_score"),
        "reviewBurstScore": _score_breakdown_value(raw, score_breakdown, "reviewBurstScore", "review_burst_score"),
        "reviewBurstStatus": raw.get("reviewBurstStatus"),
        "analysisConfidence": raw.get("analysisConfidence"),
        "analysisConfidenceDescription": raw.get("analysisConfidenceDescription"),
        "scoreBreakdown": score_breakdown,
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
        "specificitySignals": _signal_list(raw.get("specificitySignals")),
        "promoSignals": _signal_list(raw.get("promoSignals")),
        "repetitionSignals": _signal_list(raw.get("repetitionSignals")),
        "exaggerationSignals": _signal_list(raw.get("exaggerationSignals")),
        "balancedExperienceSignals": _signal_list(raw.get("balancedExperienceSignals")),
        "mentionedAspects": raw.get("mentionedAspects") if isinstance(raw.get("mentionedAspects"), dict) else {},
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
    # backend-ai 응답을 analysis_results 테이블 컬럼 구조로 접어 넣는 저장용 변환 함수다.
    # 화면에 필요한 상세 필드는 evidence_json.rawResponse에 원본 그대로 보관한다.
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
        "specificitySignals": ai_response.get("specificitySignals") or [],
        "promoSignals": ai_response.get("promoSignals") or [],
        "repetitionSignals": ai_response.get("repetitionSignals") or [],
        "exaggerationSignals": ai_response.get("exaggerationSignals") or [],
        "balancedExperienceSignals": ai_response.get("balancedExperienceSignals") or [],
        "mentionedAspects": ai_response.get("mentionedAspects") or {},
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
    # /api/analysis/analyze 응답은 방금 생성된 request/result/review id와 AI 결과를 한 번에 반환한다.
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


def _score_breakdown_value(raw, score_breakdown, camel_key, snake_key):
    return _first_present(
        raw.get(camel_key),
        raw.get(snake_key),
        score_breakdown.get(camel_key),
        score_breakdown.get(snake_key),
    )


def _string_list(value):
    if not isinstance(value, list):
        return []
    return [str(item) for item in value]


def _signal_list(value):
    if not isinstance(value, list):
        return []
    signals = []
    for item in value:
        if isinstance(item, dict):
            phrase = str(item.get("phrase") or "").strip()
            if not phrase:
                continue
            signals.append(
                {
                    "type": str(item.get("type") or "").strip(),
                    "phrase": phrase,
                    "strength": str(item.get("strength") or "medium").strip(),
                    "reason": str(item.get("reason") or "").strip(),
                }
            )
        elif str(item or "").strip():
            signals.append({"type": "", "phrase": str(item).strip(), "strength": "medium", "reason": ""})
    return signals
