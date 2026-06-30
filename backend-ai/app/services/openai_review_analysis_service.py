import json
import logging
from typing import Any

from app.core.config import Settings
from app.prompts.review_analysis_prompt import (
    REVIEW_ANALYSIS_JSON_SCHEMA,
    REVIEW_ANALYSIS_SYSTEM_PROMPT,
    REVIEW_ANALYSIS_USER_PROMPT_TEMPLATE,
)
from app.schemas.review_analysis_schema import ReviewAnalyzeRequest, ReviewAnalyzeResponse

logger = logging.getLogger(__name__)


class OpenAIReviewAnalysisService:
    ENABLED = False

    @classmethod
    def analyze(cls, payload: ReviewAnalyzeRequest, settings: Settings) -> ReviewAnalyzeResponse:
        if not cls.ENABLED:
            raise RuntimeError("OpenAI review analyzer is intentionally disabled for mock API testing")

        if not settings.openai_api_key:
            raise RuntimeError("OPENAI_API_KEY is not configured")

        try:
            from openai import OpenAI
        except ImportError as exc:
            raise RuntimeError("openai package is not installed") from exc

        client = OpenAI(
            api_key=settings.openai_api_key,
            timeout=settings.openai_timeout_seconds,
            max_retries=0,
        )
        response = client.responses.create(
            model=settings.openai_review_model,
            input=[
                {
                    "role": "system",
                    "content": REVIEW_ANALYSIS_SYSTEM_PROMPT.strip(),
                },
                {
                    "role": "user",
                    "content": cls._build_user_prompt(payload),
                },
            ],
            text={
                "format": {
                    "type": "json_schema",
                    "name": "filtory_review_analysis",
                    "schema": REVIEW_ANALYSIS_JSON_SCHEMA,
                    "strict": True,
                }
            },
        )

        raw_text = cls._extract_output_text(response)
        data = json.loads(raw_text)
        data = cls._normalize_response_data(data)
        result = ReviewAnalyzeResponse.model_validate(data)
        result.modelVersion = f"openai:{settings.openai_review_model}"
        return result

    @staticmethod
    def _build_user_prompt(payload: ReviewAnalyzeRequest) -> str:
        review_text = payload.reviewText or "\n\n".join(review for review in payload.reviews if review.strip())
        return REVIEW_ANALYSIS_USER_PROMPT_TEMPLATE.format(
            category=payload.category,
            hospital_name=payload.hospitalName or "미입력",
            review_text=review_text,
            output_language=payload.outputLanguage,
        ).strip()

    @staticmethod
    def _extract_output_text(response: Any) -> str:
        output_text = getattr(response, "output_text", None)
        if output_text:
            return output_text

        if hasattr(response, "model_dump"):
            payload = response.model_dump()
        elif hasattr(response, "to_dict"):
            payload = response.to_dict()
        else:
            payload = {}

        texts: list[str] = []
        for item in payload.get("output", []):
            for content in item.get("content", []):
                text = content.get("text")
                if text:
                    texts.append(text)

        if not texts:
            logger.debug("OpenAI response did not include output text: %s", payload)
            raise ValueError("OpenAI response did not include output text")

        return "".join(texts)

    @staticmethod
    def _normalize_response_data(data: Any) -> dict[str, Any]:
        if not isinstance(data, dict):
            raise ValueError("OpenAI response JSON must be an object")

        normalized = {
            "trustScore": OpenAIReviewAnalysisService._clamp_score(data.get("trustScore")),
            "trustGrade": OpenAIReviewAnalysisService._normalize_trust_grade(data.get("trustGrade")),
            "trustLevelKey": OpenAIReviewAnalysisService._normalize_trust_level_key(data.get("trustLevelKey")),
            "adSuspicion": OpenAIReviewAnalysisService._normalize_ad_suspicion(data.get("adSuspicion")),
            "adSuspicionLevel": OpenAIReviewAnalysisService._normalize_ad_suspicion_level(data.get("adSuspicionLevel")),
            "detectedPatterns": OpenAIReviewAnalysisService._normalize_string_list(data.get("detectedPatterns")),
            "suspiciousPhrases": OpenAIReviewAnalysisService._normalize_string_list(data.get("suspiciousPhrases")),
            "repetitivePhrases": OpenAIReviewAnalysisService._normalize_string_list(data.get("repetitivePhrases")),
            "informationLevel": OpenAIReviewAnalysisService._normalize_information_level(data.get("informationLevel")),
            "summary": OpenAIReviewAnalysisService._short_text(data.get("summary"), 220),
            "recommendation": OpenAIReviewAnalysisService._short_text(data.get("recommendation"), 180),
            "modelVersion": str(data.get("modelVersion") or "openai"),
        }

        if not normalized["detectedPatterns"]:
            normalized["detectedPatterns"] = ["특별히 강한 의심 패턴 없음"]

        return normalized

    @staticmethod
    def _clamp_score(value: Any) -> int:
        try:
            score = int(round(float(value)))
        except (TypeError, ValueError):
            score = 50
        return max(0, min(100, score))

    @staticmethod
    def _normalize_trust_grade(value: Any) -> str:
        normalized = str(value or "").strip()
        if normalized in {"매우 신뢰", "양호", "주의", "의심", "매우 의심"}:
            return normalized
        return "주의"

    @staticmethod
    def _normalize_trust_level_key(value: Any) -> str:
        normalized = str(value or "").strip()
        if normalized in {"veryHigh", "high", "caution", "concern", "veryConcern"}:
            return normalized
        return "caution"

    @staticmethod
    def _normalize_ad_suspicion(value: Any) -> str:
        normalized = str(value or "").strip()
        if normalized in {"낮음", "보통", "높음"}:
            return normalized
        if normalized.lower() == "low":
            return "낮음"
        if normalized.lower() == "high":
            return "높음"
        return "보통"

    @staticmethod
    def _normalize_ad_suspicion_level(value: Any) -> str:
        normalized = str(value or "").strip().lower()
        if normalized in {"low", "medium", "high"}:
            return normalized
        if normalized == "낮음":
            return "low"
        if normalized == "높음":
            return "high"
        return "medium"

    @staticmethod
    def _normalize_information_level(value: Any) -> str:
        normalized = str(value or "").strip()
        if normalized in {"구체적", "보통", "정보 부족"}:
            return normalized
        return "보통"

    @staticmethod
    def _normalize_string_list(value: Any) -> list[str]:
        if isinstance(value, list):
            return [str(item).strip() for item in value if str(item).strip()][:8]
        if isinstance(value, str) and value.strip():
            return [value.strip()]
        return []

    @staticmethod
    def _short_text(value: Any, max_length: int) -> str:
        text = str(value or "").strip()
        if not text:
            return "리뷰의 구체성, 광고성 의심 표현, 반복 패턴을 기준으로 분석했습니다."
        return text[:max_length]
