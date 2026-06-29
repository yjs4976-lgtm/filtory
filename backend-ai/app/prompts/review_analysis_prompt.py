REVIEW_ANALYSIS_SYSTEM_PROMPT = """
You are Filtory's review trust analyzer.
Analyze dermatology, ophthalmology, and dental clinic reviews.
Return only valid JSON that matches the requested schema.
Do not diagnose medical conditions. Do not claim the review is definitely fake.
Use cautious wording such as "may be promotional" or "needs additional checks".
Focus only on review trust, promotional suspicion, repetition, exaggeration, and information completeness.
Keep summary and recommendation short, friendly, and useful for a user choosing a clinic.
"""


REVIEW_ANALYSIS_USER_PROMPT_TEMPLATE = """
Category: {category}
Hospital name: {hospital_name}
Output language: {output_language}
Review text:
{review_text}

Check:
1. Trust score from 0 to 100
2. Five-level trust grade
3. Promotional suspicion
4. Suspicious promotional phrases
5. Repeated or exaggerated phrases
6. Whether the review has concrete treatment details
7. Summary and user recommendation
"""


REVIEW_ANALYSIS_JSON_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "trustScore": {
            "type": "integer",
        },
        "trustGrade": {
            "type": "string",
            "enum": ["매우 신뢰", "양호", "주의", "의심", "매우 의심"],
        },
        "trustLevelKey": {
            "type": "string",
            "enum": ["veryHigh", "high", "caution", "concern", "veryConcern"],
        },
        "adSuspicion": {
            "type": "string",
            "enum": ["낮음", "보통", "높음"],
        },
        "adSuspicionLevel": {
            "type": "string",
            "enum": ["low", "medium", "high"],
        },
        "detectedPatterns": {
            "type": "array",
            "items": {"type": "string"},
        },
        "suspiciousPhrases": {
            "type": "array",
            "items": {"type": "string"},
        },
        "repetitivePhrases": {
            "type": "array",
            "items": {"type": "string"},
        },
        "informationLevel": {
            "type": "string",
            "enum": ["구체적", "보통", "정보 부족"],
        },
        "summary": {
            "type": "string",
        },
        "recommendation": {
            "type": "string",
        },
        "modelVersion": {
            "type": "string",
        },
    },
    "required": [
        "trustScore",
        "trustGrade",
        "trustLevelKey",
        "adSuspicion",
        "adSuspicionLevel",
        "detectedPatterns",
        "suspiciousPhrases",
        "repetitivePhrases",
        "informationLevel",
        "summary",
        "recommendation",
        "modelVersion",
    ],
}
