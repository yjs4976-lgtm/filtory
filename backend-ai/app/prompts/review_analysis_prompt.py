REVIEW_ANALYSIS_SYSTEM_PROMPT = """
You are Filtory's review trust analyzer.
Analyze dermatology, ophthalmology, and dental clinic reviews.
Filtory does not recommend hospitals on behalf of users.
Filtory helps users compare how concrete and review-like their candidate clinic reviews feel.
Analyze only reviews directly provided by the user. Do not crawl or infer from external platforms.
Do not claim a review is fake, manipulated, promotional, dangerous, legally problematic, or definitely trustworthy.
Do not diagnose medical conditions, recommend treatment, or provide legal judgment.
Use cautious wording such as "may look promotional", "some repeated patterns appear", or "needs additional checks".
Return only valid JSON that matches the requested schema. Do not add markdown, code fences, or explanations outside JSON.
The server will calculate totalScore, placeScore, foreignerScore, analyzedReviewCount, and modelVersion.
Focus on trustScore, adScore, repetitionLevel, informationLevel, evidence, summary, and recommendation.
"""


REVIEW_ANALYSIS_USER_PROMPT_TEMPLATE = """
Category: {category}
Hospital name: {hospital_name}
Output language: {output_language}
Review text:
{review_text}

Check:
1. trustScore from 0 to 100. Higher means the review is more concrete and useful as reference information.
2. adScore from 0 to 100. Higher means stronger promotional or advertising-like suspicion.
3. repetitionLevel: low, medium, or high.
4. informationLevel.
   - If outputLanguage is ko: 매우 구체적, 구체적, 보통, 정보 부족, 매우 부족.
   - If outputLanguage is en: Very specific, Specific, Moderate, Limited, Very limited.
5. evidence.suspiciousPhrases: short phrases that may look promotional.
6. evidence.specificPhrases: short phrases that show concrete visit, consultation, cost, waiting, pain, or process details.
7. evidence.repetitivePhrases: repeated or exaggerated phrases.
8. evidence.warnings: cautious warning signals. Do not make definitive claims.
9. evidence.positiveSignals: concrete signals that can help comparison.
10. evidence.checkItems: short items the user should verify before choosing a clinic.
11. summary and recommendation in the requested output language.
"""


REVIEW_ANALYSIS_JSON_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "trustScore": {
            "type": "integer",
            "minimum": 0,
            "maximum": 100,
        },
        "adScore": {
            "type": "integer",
            "minimum": 0,
            "maximum": 100,
        },
        "repetitionLevel": {
            "type": "string",
            "enum": ["low", "medium", "high"],
        },
        "informationLevel": {
            "type": "string",
            "enum": [
                "매우 구체적",
                "구체적",
                "보통",
                "정보 부족",
                "매우 부족",
                "Very specific",
                "Specific",
                "Moderate",
                "Limited",
                "Very limited",
            ],
        },
        "summary": {
            "type": "string",
        },
        "recommendation": {
            "type": "string",
        },
        "evidence": {
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "suspiciousPhrases": {
                    "type": "array",
                    "items": {"type": "string"},
                },
                "specificPhrases": {
                    "type": "array",
                    "items": {"type": "string"},
                },
                "repetitivePhrases": {
                    "type": "array",
                    "items": {"type": "string"},
                },
                "warnings": {
                    "type": "array",
                    "items": {"type": "string"},
                },
                "positiveSignals": {
                    "type": "array",
                    "items": {"type": "string"},
                },
                "checkItems": {
                    "type": "array",
                    "items": {"type": "string"},
                },
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
    },
    "required": [
        "trustScore",
        "adScore",
        "repetitionLevel",
        "informationLevel",
        "summary",
        "recommendation",
        "evidence",
    ],
}
