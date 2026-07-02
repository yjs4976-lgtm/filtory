REVIEW_ANALYSIS_SYSTEM_PROMPT = """
You are Filtory's review trust analyzer for dermatology, ophthalmology, and dental clinic reviews.

Return only one valid JSON object. Do not include markdown, code fences, explanations, comments, or any text before or after JSON.
All fields in the schema are required. Use empty arrays when no array values exist.
All score fields must be numbers from 0 to 100.
Use only the enum values defined in the schema.
Write Korean summary, recommendation, and visitTip naturally and cautiously.
Do not diagnose, guarantee treatment results, make legal judgments, or directly recommend or condemn a clinic.
Analyze only the provided review text from a review-trust perspective.
""".strip()


REVIEW_ANALYSIS_USER_PROMPT_TEMPLATE = """
Category: {category}
Hospital name: {hospital_name}
Output language requested by user: {output_language}

Review text:
{review_text}

Return a JSON object with these exact fields:
- trustScore: 0-100. Higher means the review is more concrete and useful as reference information.
- trustGrade: one of ["매우 안전", "안전", "보통", "주의", "위험"].
- trustLevelKey: one of ["very_safe", "safe", "normal", "caution", "danger"].
- adSuspicionScore: 0-100. Higher means stronger promotional or advertising-like suspicion.
- adSuspicionLevel: one of ["낮음", "보통", "높음"].
- informationScore: 0-100. Higher means more concrete visit, waiting, explanation, cost, staff, and process information.
- informationLevel: one of ["부족", "보통", "충분"].
- globalAccessibilityScore: 0-100. Estimate only from provided review and clinic metadata hints about foreign visitor convenience such as English guidance, foreign-language support, reservation/location information, and visit-planning details.
- globalAccessibilityLevel: one of ["낮음", "보통", "높음"].
- detectedPatterns: array of important review patterns.
- suspiciousPhrases: array of promotional or exaggerated phrases. Empty array if none.
- repetitivePhrases: array of repeated phrases. Empty array if none.
- positiveSignals: array of signals that increase review trust.
- negativeSignals: array of signals that lower review trust.
- summary: Korean 2-3 sentence user-friendly summary.
- recommendation: Korean 1-2 sentence cautious advice for comparing clinic information.
- visitTip: Korean 1-2 sentence pre-visit checklist tip.
- modelVersion: "openai-review-analyzer-v1".

Score rules:
- trustScore 85-100: very_safe / 매우 안전
- trustScore 70-84: safe / 안전
- trustScore 50-69: normal / 보통
- trustScore 30-49: caution / 주의
- trustScore 0-29: danger / 위험
- adSuspicionScore 0-39: 낮음, 40-69: 보통, 70-100: 높음
- informationScore 0-39: 부족, 40-69: 보통, 70-100: 충분
- globalAccessibilityScore 0-39: 낮음, 40-69: 보통, 70-100: 높음
""".strip()


REVIEW_ANALYSIS_JSON_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "trustScore": {"type": "integer", "minimum": 0, "maximum": 100},
        "trustGrade": {"type": "string", "enum": ["매우 안전", "안전", "보통", "주의", "위험"]},
        "trustLevelKey": {"type": "string", "enum": ["very_safe", "safe", "normal", "caution", "danger"]},
        "adSuspicionScore": {"type": "integer", "minimum": 0, "maximum": 100},
        "adSuspicionLevel": {"type": "string", "enum": ["낮음", "보통", "높음"]},
        "informationScore": {"type": "integer", "minimum": 0, "maximum": 100},
        "informationLevel": {"type": "string", "enum": ["부족", "보통", "충분"]},
        "globalAccessibilityScore": {"type": "integer", "minimum": 0, "maximum": 100},
        "globalAccessibilityLevel": {"type": "string", "enum": ["낮음", "보통", "높음"]},
        "detectedPatterns": {"type": "array", "items": {"type": "string"}},
        "suspiciousPhrases": {"type": "array", "items": {"type": "string"}},
        "repetitivePhrases": {"type": "array", "items": {"type": "string"}},
        "positiveSignals": {"type": "array", "items": {"type": "string"}},
        "negativeSignals": {"type": "array", "items": {"type": "string"}},
        "summary": {"type": "string"},
        "recommendation": {"type": "string"},
        "visitTip": {"type": "string"},
        "modelVersion": {"type": "string"},
    },
    "required": [
        "trustScore",
        "trustGrade",
        "trustLevelKey",
        "adSuspicionScore",
        "adSuspicionLevel",
        "informationScore",
        "informationLevel",
        "globalAccessibilityScore",
        "globalAccessibilityLevel",
        "detectedPatterns",
        "suspiciousPhrases",
        "repetitivePhrases",
        "positiveSignals",
        "negativeSignals",
        "summary",
        "recommendation",
        "visitTip",
        "modelVersion",
    ],
}
