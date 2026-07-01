import json
import logging
from typing import Any

from app.core.config import Settings
from app.prompts.review_analysis_prompt import (
    REVIEW_ANALYSIS_JSON_SCHEMA,
    REVIEW_ANALYSIS_SYSTEM_PROMPT,
    REVIEW_ANALYSIS_USER_PROMPT_TEMPLATE,
)
from app.schemas.review_analysis_schema import ReviewAnalyzeRequest, ReviewAnalyzeResponse, ReviewEvidence

logger = logging.getLogger(__name__)


class OpenAIReviewAnalysisService:
    @classmethod
    def analyze(cls, payload: ReviewAnalyzeRequest, settings: Settings) -> ReviewAnalyzeResponse:
        if not settings.openai_api_key:
            raise RuntimeError("OPENAI_API_KEY is not configured")
        if not settings.openai_review_model:
            raise RuntimeError("OPENAI_REVIEW_MODEL is not configured")

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
        normalized = cls.normalize_response_data(
            data=data,
            payload=payload,
            model_version=f"openai:{settings.openai_review_model}",
        )
        return ReviewAnalyzeResponse.model_validate(normalized)

    @staticmethod
    def _build_user_prompt(payload: ReviewAnalyzeRequest) -> str:
        review_text = OpenAIReviewAnalysisService.merge_review_text(payload)
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
            logger.debug("OpenAI response did not include output text")
            raise ValueError("OpenAI response did not include output text")

        return "".join(texts)

    @classmethod
    def normalize_response_data(
        cls,
        data: Any,
        payload: ReviewAnalyzeRequest,
        model_version: str,
    ) -> dict[str, Any]:
        if not isinstance(data, dict):
            raise ValueError("OpenAI response JSON must be an object")

        language = payload.outputLanguage
        evidence = cls._normalize_evidence(data.get("evidence"), language)
        trust_score = cls._clamp_score(data.get("trustScore"))
        ad_score = cls._clamp_score(data.get("adScore"))
        place_score = cls.calculate_place_score(payload)
        foreigner_score = cls.calculate_foreigner_score(payload)
        total_score = cls.calculate_total_score(
            trust_score=trust_score,
            ad_score=ad_score,
            place_score=place_score,
            foreigner_score=foreigner_score,
        )
        repetition_level = cls._normalize_level(data.get("repetitionLevel"))
        information_level = cls._normalize_information_level(data.get("informationLevel"), language)
        trust_level_key = cls.trust_level_key(trust_score)
        ad_suspicion_level = cls.ad_suspicion_level(ad_score)
        warning_signals = evidence.warnings
        positive_signals = evidence.positiveSignals

        detected_patterns = cls._detected_patterns(
            suspicious_phrases=evidence.suspiciousPhrases,
            repetitive_phrases=evidence.repetitivePhrases,
            warnings=warning_signals,
            language=language,
        )

        return {
            "totalScore": total_score,
            "trustScore": trust_score,
            "adScore": ad_score,
            "placeScore": place_score,
            "foreignerScore": foreigner_score,
            "grade": cls.grade(total_score),
            "trustGrade": cls.trust_grade(trust_level_key, language),
            "trustLevelKey": trust_level_key,
            "adSuspicion": cls.ad_suspicion(ad_suspicion_level, language),
            "adSuspicionLevel": ad_suspicion_level,
            "repetitionLevel": repetition_level,
            "informationCompleteness": cls.information_completeness(information_level),
            "positiveSignals": positive_signals,
            "warningSignals": warning_signals,
            "globalAccessibilityScore": cls.global_accessibility_score(foreigner_score),
            "globalAccessibilityMaxScore": 5,
            "globalAccessibilityChecks": cls.global_accessibility_checks(payload),
            "detectedPatterns": detected_patterns,
            "suspiciousPhrases": evidence.suspiciousPhrases,
            "repetitivePhrases": evidence.repetitivePhrases,
            "informationLevel": information_level,
            "summary": cls._short_text(data.get("summary"), 220, language),
            "recommendation": cls._short_text(data.get("recommendation"), 180, language),
            "evidence": evidence.model_dump(),
            "analyzedReviewCount": cls.analyzed_review_count(payload),
            "modelVersion": model_version,
        }

    @staticmethod
    def merge_review_text(payload: ReviewAnalyzeRequest) -> str:
        pieces = []
        if payload.reviewText and payload.reviewText.strip():
            pieces.append(payload.reviewText.strip())
        pieces.extend(review.strip() for review in payload.reviews if review.strip())
        return "\n\n".join(dict.fromkeys(pieces))

    @staticmethod
    def analyzed_review_count(payload: ReviewAnalyzeRequest) -> int:
        reviews = []
        if payload.reviewText and payload.reviewText.strip():
            reviews.append(payload.reviewText.strip())
        reviews.extend(review.strip() for review in payload.reviews if review.strip())
        return len(dict.fromkeys(reviews))

    @staticmethod
    def calculate_place_score(payload: ReviewAnalyzeRequest) -> int:
        checks = [
            (payload.hospitalName, 15),
            (payload.address, 15),
            (payload.phone, 10),
            (payload.treatmentItems, 15),
            (payload.description, 10),
            (payload.hasPhotos, 10),
            (payload.homepageUrl, 10),
            (payload.naverPlaceUrl or payload.naverPlaceId, 15),
        ]
        return OpenAIReviewAnalysisService._weighted_metadata_score(checks)

    @staticmethod
    def calculate_foreigner_score(payload: ReviewAnalyzeRequest) -> int:
        checks = [
            (payload.googleMapUrl or payload.googleRegistered, 20),
            (payload.googlePlaceId, 15),
            (payload.englishName, 20),
            (payload.hasEnglishInfo, 20),
            (payload.hasEnglishReviews, 10),
            (payload.hasGooglePhotos, 10),
            (payload.homepageUrl, 5),
        ]
        return OpenAIReviewAnalysisService._weighted_metadata_score(checks)

    @staticmethod
    def calculate_total_score(
        trust_score: int,
        ad_score: int,
        place_score: int,
        foreigner_score: int,
    ) -> int:
        score = (
            trust_score * 0.45
            + place_score * 0.25
            + foreigner_score * 0.15
            + (100 - ad_score) * 0.15
        )
        return OpenAIReviewAnalysisService._clamp_score(score)

    @staticmethod
    def calculate_comparison_score(
        trust_score: int,
        ad_score: int,
        place_score: int,
        foreigner_score: int,
    ) -> int:
        # Reserved for future comparison ranking; it is not returned by this API yet.
        score = (
            trust_score * 0.40
            + (100 - ad_score) * 0.25
            + place_score * 0.25
            + foreigner_score * 0.10
        )
        return OpenAIReviewAnalysisService._clamp_score(score)

    @staticmethod
    def trust_level_key(score: int) -> str:
        if score >= 85:
            return "very_high"
        if score >= 70:
            return "high"
        if score >= 50:
            return "medium"
        if score >= 30:
            return "low"
        return "very_low"

    @staticmethod
    def ad_suspicion_level(score: int) -> str:
        if score >= 70:
            return "high"
        if score >= 40:
            return "medium"
        return "low"

    @staticmethod
    def grade(score: int) -> str:
        if score >= 85:
            return "A"
        if score >= 70:
            return "B"
        if score >= 50:
            return "C"
        if score >= 30:
            return "D"
        return "F"

    @staticmethod
    def trust_grade(level_key: str, language: str) -> str:
        if language == "en":
            labels = {
                "very_high": "Very high",
                "high": "High",
                "medium": "Medium",
                "low": "Low",
                "very_low": "Very low",
            }
        else:
            labels = {
                "very_high": "매우 높음",
                "high": "높음",
                "medium": "보통",
                "low": "낮음",
                "very_low": "매우 낮음",
            }
        return labels.get(level_key, labels["medium"])

    @staticmethod
    def ad_suspicion(level_key: str, language: str) -> str:
        if language == "en":
            labels = {"low": "Low", "medium": "Medium", "high": "High"}
        else:
            labels = {"low": "낮음", "medium": "보통", "high": "높음"}
        return labels.get(level_key, labels["medium"])

    @staticmethod
    def information_completeness(information_level: str) -> str:
        if information_level in {"매우 구체적", "구체적", "Very specific", "Specific"}:
            return "high"
        if information_level in {"정보 부족", "매우 부족", "Limited", "Very limited"}:
            return "low"
        return "medium"

    @staticmethod
    def global_accessibility_score(foreigner_score: int) -> int:
        return max(0, min(5, round(foreigner_score / 20)))

    @staticmethod
    def global_accessibility_checks(payload: ReviewAnalyzeRequest) -> dict[str, bool]:
        return {
            "googleMapLink": bool(payload.googleMapUrl or payload.googleRegistered),
            "googlePlaceId": bool(payload.googlePlaceId),
            "englishName": bool(payload.englishName),
            "englishGuide": bool(payload.hasEnglishInfo),
            "englishReviews": bool(payload.hasEnglishReviews),
            "homepageOrBookingLink": bool(payload.homepageUrl),
            "photoInfo": bool(payload.hasGooglePhotos or payload.hasPhotos),
        }

    @staticmethod
    def _weighted_metadata_score(checks: list[tuple[Any, int]]) -> int:
        score = 0
        for value, weight in checks:
            if isinstance(value, list):
                present = any(str(item).strip() for item in value)
            elif isinstance(value, bool):
                present = value
            else:
                present = bool(str(value or "").strip())
            if present:
                score += weight
        return OpenAIReviewAnalysisService._clamp_score(score)

    @staticmethod
    def _normalize_evidence(value: Any, language: str) -> ReviewEvidence:
        data = value if isinstance(value, dict) else {}
        evidence = ReviewEvidence(
            suspiciousPhrases=OpenAIReviewAnalysisService._normalize_string_list(data.get("suspiciousPhrases")),
            specificPhrases=OpenAIReviewAnalysisService._normalize_string_list(data.get("specificPhrases")),
            repetitivePhrases=OpenAIReviewAnalysisService._normalize_string_list(data.get("repetitivePhrases")),
            warnings=OpenAIReviewAnalysisService._normalize_string_list(data.get("warnings")),
            positiveSignals=OpenAIReviewAnalysisService._normalize_string_list(data.get("positiveSignals")),
            checkItems=OpenAIReviewAnalysisService._normalize_string_list(data.get("checkItems")),
        )

        if not evidence.warnings:
            evidence.warnings = [
                "최신 리뷰와 병원 기본 정보를 함께 확인하는 것이 좋습니다."
                if language == "ko"
                else "Check recent reviews and basic clinic information together."
            ]
        if not evidence.checkItems:
            evidence.checkItems = (
                ["최신 리뷰", "비용 안내", "진료 항목", "예약 방식"]
                if language == "ko"
                else ["Recent reviews", "Cost guidance", "Treatment items", "Booking method"]
            )
        return evidence

    @staticmethod
    def _detected_patterns(
        suspicious_phrases: list[str],
        repetitive_phrases: list[str],
        warnings: list[str],
        language: str,
    ) -> list[str]:
        patterns = []
        if suspicious_phrases:
            patterns.append("광고성으로 보일 수 있는 표현 포함" if language == "ko" else "Some promotional-looking wording")
        if repetitive_phrases:
            patterns.append("반복 표현 일부 확인" if language == "ko" else "Some repeated wording")
        patterns.extend(warnings[:2])
        if patterns:
            return patterns[:5]
        return ["뚜렷한 위험 신호는 제한적입니다." if language == "ko" else "No strong warning signal was found."]

    @staticmethod
    def _clamp_score(value: Any) -> int:
        try:
            score = int(round(float(value)))
        except (TypeError, ValueError):
            score = 50
        return max(0, min(100, score))

    @staticmethod
    def _normalize_level(value: Any) -> str:
        normalized = str(value or "").strip().lower()
        if normalized in {"low", "medium", "high"}:
            return normalized
        return "low"

    @staticmethod
    def _normalize_information_level(value: Any, language: str) -> str:
        normalized = str(value or "").strip()
        ko_levels = {"매우 구체적", "구체적", "보통", "정보 부족", "매우 부족"}
        en_levels = {"Very specific", "Specific", "Moderate", "Limited", "Very limited"}
        if language == "en":
            if normalized in en_levels:
                return normalized
            if normalized in {"매우 구체적", "구체적"}:
                return "Specific"
            if normalized in {"정보 부족", "매우 부족"}:
                return "Limited"
            return "Moderate"
        if normalized in ko_levels:
            return normalized
        if normalized in {"Very specific", "Specific"}:
            return "구체적"
        if normalized in {"Limited", "Very limited"}:
            return "정보 부족"
        return "보통"

    @staticmethod
    def _normalize_string_list(value: Any) -> list[str]:
        if isinstance(value, list):
            return [str(item).strip() for item in value if str(item).strip()][:8]
        if isinstance(value, str) and value.strip():
            return [value.strip()]
        return []

    @staticmethod
    def _short_text(value: Any, max_length: int, language: str) -> str:
        text = str(value or "").strip()
        if not text:
            return (
                "리뷰의 구체성, 광고성으로 보일 수 있는 표현, 반복 패턴을 기준으로 분석했습니다."
                if language == "ko"
                else "The review was analyzed by concreteness, promotional-looking wording, and repetition."
            )
        return text[:max_length]
