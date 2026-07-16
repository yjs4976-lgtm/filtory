REVIEW_ANALYSIS_SYSTEM_PROMPT = """
You are Filtory's review trust analyzer for dermatology, ophthalmology, dental, and orthopedics clinic reviews.

Return only one valid JSON object. Do not include markdown, code fences, explanations, comments, or any text before or after JSON.
All fields in the schema are required. Use empty arrays when no array values exist.
All score fields must be numbers from 0 to 100.
Use only the enum values defined in the schema.
Write summary and recommendation naturally and cautiously in the requested output language.
Do not diagnose, guarantee treatment results, make legal judgments, or directly recommend or condemn a clinic.
Analyze only the provided review text from a review-trust perspective.
If pasted text includes clinic/business/owner replies, ignore those replies and analyze only patient/customer review content.
""".strip()


REVIEW_ANALYSIS_USER_PROMPT_TEMPLATE = """
Category: {category}
Hospital name: {hospital_name}
Output language requested by user: {output_language}

Review text:
{review_text}

If the review text contains clinic replies, owner replies, or business responses, exclude them from evidence, scores, and signals.

Return a JSON object with these exact fields:
- trustScore: 0-100. Higher means the review is more concrete and useful as reference information.
- adScore: 0-100. Higher means stronger promotional or advertising-like suspicion.
- repetitionLevel: one of ["low", "medium", "high"]. Estimate repeated phrase or template-like pattern level.
- informationLevel: one of ["부족", "보통", "충분"].
- evidence: object with suspiciousPhrases, specificPhrases, repetitivePhrases, warnings, positiveSignals, and checkItems arrays.
- specificitySignals: array of concrete review detail signals.
- promoSignals: array of promotional or call-to-action signals.
- repetitionSignals: array of repeated wording or template-like signals.
- exaggerationSignals: array of exaggerated expression signals.
- balancedExperienceSignals: array of balanced positive/negative experience signals.
- mentionedAspects: object with costMentioned, waitingMentioned, treatmentProcessMentioned, and aftercareMentioned booleans.
- summary: 2-3 sentence user-friendly summary in the requested output language.
- recommendation: 1-2 sentence cautious advice for comparing clinic information in the requested output language.

Score rules:
- trustScore 85-100: very_safe / 매우 안전
- trustScore 70-84: safe / 안전
- trustScore 50-69: normal / 보통
- trustScore 30-49: caution / 주의
- trustScore 0-29: danger / 위험
- adScore 0-39: 낮음, 40-69: 보통, 70-100: 높음
- informationLevel should reflect concrete visit detail, not whether the clinic is good or bad.
""".strip()


REVIEW_ANALYSIS_JSON_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "trustScore": {"type": "integer", "minimum": 0, "maximum": 100},
        "adScore": {"type": "integer", "minimum": 0, "maximum": 100},
        "repetitionLevel": {"type": "string", "enum": ["low", "medium", "high"]},
        "informationLevel": {"type": "string", "enum": ["부족", "보통", "충분"]},
        "evidence": {
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "suspiciousPhrases": {"type": "array", "items": {"type": "string"}},
                "specificPhrases": {"type": "array", "items": {"type": "string"}},
                "repetitivePhrases": {"type": "array", "items": {"type": "string"}},
                "warnings": {"type": "array", "items": {"type": "string"}},
                "positiveSignals": {"type": "array", "items": {"type": "string"}},
                "checkItems": {"type": "array", "items": {"type": "string"}},
            },
            "required": [
                "suspiciousPhrases",
                "specificPhrases",
                "repetitivePhrases",
                "warnings",
                "positiveSignals",
                "checkItems",
            ],
        },
        "specificitySignals": {
            "type": "array",
            "items": {"$ref": "#/$defs/reviewSignal"},
        },
        "promoSignals": {
            "type": "array",
            "items": {"$ref": "#/$defs/reviewSignal"},
        },
        "repetitionSignals": {
            "type": "array",
            "items": {"$ref": "#/$defs/reviewSignal"},
        },
        "exaggerationSignals": {
            "type": "array",
            "items": {"$ref": "#/$defs/reviewSignal"},
        },
        "balancedExperienceSignals": {
            "type": "array",
            "items": {"$ref": "#/$defs/reviewSignal"},
        },
        "mentionedAspects": {
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "costMentioned": {"type": "boolean"},
                "waitingMentioned": {"type": "boolean"},
                "treatmentProcessMentioned": {"type": "boolean"},
                "aftercareMentioned": {"type": "boolean"},
            },
            "required": [
                "costMentioned",
                "waitingMentioned",
                "treatmentProcessMentioned",
                "aftercareMentioned",
            ],
        },
        "summary": {"type": "string"},
        "recommendation": {"type": "string"},
    },
    "$defs": {
        "reviewSignal": {
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "type": {"type": "string"},
                "phrase": {"type": "string"},
                "strength": {"type": "string", "enum": ["low", "medium", "strong"]},
                "reason": {"type": "string"},
            },
            "required": ["type", "phrase", "strength", "reason"],
        }
    },
    "required": [
        "trustScore",
        "adScore",
        "repetitionLevel",
        "informationLevel",
        "evidence",
        "specificitySignals",
        "promoSignals",
        "repetitionSignals",
        "exaggerationSignals",
        "balancedExperienceSignals",
        "mentionedAspects",
        "summary",
        "recommendation",
    ],
}
