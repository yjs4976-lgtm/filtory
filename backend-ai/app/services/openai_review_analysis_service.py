import json
import logging
import re
from collections import Counter
from datetime import datetime
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
    MODEL_VERSION = "openai-review-analyzer-v1"
    FALLBACK_MODEL_VERSION = "openai-review-analyzer-v1-fallback"
    CONCRETE_KEYWORDS = [
        "상담",
        "비용",
        "가격",
        "대기",
        "시술",
        "진료",
        "검사",
        "설명",
        "예약",
        "통증",
        "경과",
        "처방",
        "aftercare",
        "consultation",
        "cost",
        "price",
        "waiting",
        "reservation",
        "treatment",
    ]
    PROMO_TERMS = [
        "할인",
        "이벤트",
        "강추",
        "무조건 추천",
        "최고",
        "대박",
        "꼭 가세요",
        "지인 추천",
        "혜택",
        "무료",
        "협찬",
        "체험단",
        "recommended by a friend",
        "must go",
        "best ever",
        "highly recommend",
        "discount",
        "event",
        "promotion",
        "sponsored",
    ]
    ACTION_TERMS = [
        "추천",
        "가세요",
        "예약",
        "문의",
        "받아보세요",
        "해보세요",
        "꼭",
        "무조건",
        "go",
        "book",
        "try",
        "must",
        "recommend",
    ]
    NEGATION_TERMS = [
        "없었",
        "아니",
        "않았",
        "안 했",
        "안했",
        "광고 같지는",
        "광고같지는",
        "광고는 아니",
        "not",
        "no ",
        "wasn't",
        "isn't",
        "not sponsored",
        "no discount",
    ]
    ENGLISH_GUIDANCE_KEYWORDS = [
        "english",
        "영어 안내",
        "foreigner",
        "international",
        "multilingual",
        "interpreter",
        "translation",
        "통역",
        "외국인 진료",
        "외국어 안내",
    ]
    ENGLISH_GUIDANCE_NEGATIVE_PATTERNS = [
        r"영어.{0,8}(없|불가|안\s*됨|지원하지|안\s*해|못\s*해)",
        r"통역.{0,8}(없|불가|안\s*됨|지원하지|안\s*해|못\s*해)",
        r"외국인.{0,8}(불가|안\s*됨|진료\s*안|받지\s*않)",
        r"(no|not|without).{0,12}(english|interpreter|translation|foreigner)",
        r"(english|interpreter|translation|foreigner).{0,12}(not available|unavailable|unsupported)",
    ]

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
        try:
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
            data = cls._parse_json_output(raw_text)
            normalized = cls.normalize_response_data(
                data=data,
                payload=payload,
                model_version=cls.MODEL_VERSION,
            )
        except Exception as exc:
            logger.warning("OpenAI review analysis failed; returning safe fallback: %s", exc)
            normalized = cls.fallback_response_data(payload)
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

    @staticmethod
    def _parse_json_output(raw_text: str) -> dict[str, Any]:
        text = str(raw_text or "").strip()
        if text.startswith("```"):
            lines = text.splitlines()
            if lines and lines[0].strip().startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]
            text = "\n".join(lines).strip()

        try:
            data = json.loads(text)
        except json.JSONDecodeError:
            start = text.find("{")
            end = text.rfind("}")
            if start < 0 or end <= start:
                raise
            data = json.loads(text[start : end + 1])

        if not isinstance(data, dict):
            raise ValueError("OpenAI response JSON must be an object")
        return data

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
        base_trust_score = cls._clamp_score(data.get("trustScore"))
        ad_score = cls._clamp_score(data.get("adScore", data.get("adSuspicionScore")))
        review_information_score = cls._information_score(data.get("informationScore"), data.get("informationLevel"))
        place_score = cls.calculate_place_score(payload)
        foreigner_score = cls.calculate_foreigner_score(payload)
        score_breakdown = cls.calculate_review_score_breakdown(
            payload=payload,
            data=data,
            evidence=cls._normalize_evidence(data, language),
            base_trust_score=base_trust_score,
            ad_score=ad_score,
            review_information_score=review_information_score,
        )
        review_trust_score = score_breakdown["reviewTrustScore"]
        total_score = cls.calculate_total_score(
            trust_score=review_trust_score,
            ad_score=ad_score,
            place_score=place_score,
            foreigner_score=foreigner_score,
        )
        evidence = score_breakdown.pop("_evidence")
        repetition_level = cls._repetition_level(data.get("repetitionLevel"), evidence.repetitivePhrases)
        review_information_level = cls.information_level(review_information_score)
        information_level = cls.information_level(place_score)
        trust_level_key = cls.trust_level_key(review_trust_score)
        ad_suspicion_level = cls.ad_suspicion_level(ad_score)
        global_accessibility_level = cls.score_level(foreigner_score)
        warning_signals = evidence.warnings
        positive_signals = evidence.positiveSignals
        negative_signals = cls._normalize_string_list(data.get("negativeSignals")) or warning_signals

        detected_patterns = cls._normalize_string_list(data.get("detectedPatterns")) or cls._detected_patterns(
            suspicious_phrases=evidence.suspiciousPhrases,
            repetitive_phrases=evidence.repetitivePhrases,
            warnings=warning_signals,
            language=language,
        )

        return {
            "totalScore": total_score,
            "trustScore": review_trust_score,
            "reviewTrustScore": review_trust_score,
            "evidenceScore": score_breakdown["evidenceScore"],
            "riskScore": score_breakdown["riskScore"],
            "specificityScore": score_breakdown["specificityScore"],
            "balanceScore": score_breakdown["balanceScore"],
            "diversityScore": score_breakdown["diversityScore"],
            "informativeScore": score_breakdown["informativeScore"],
            "naturalnessScore": score_breakdown["naturalnessScore"],
            "promoSignalScore": score_breakdown["promoSignalScore"],
            "repetitionScore": score_breakdown["repetitionScore"],
            "exaggerationScore": score_breakdown["exaggerationScore"],
            "eventDiscountScore": score_breakdown["eventDiscountScore"],
            "reviewBurstScore": score_breakdown["reviewBurstScore"],
            "reviewBurstStatus": score_breakdown["reviewBurstStatus"],
            "analysisConfidence": score_breakdown["analysisConfidence"],
            "analysisConfidenceDescription": cls.analysis_confidence_description(score_breakdown["analysisConfidence"], language),
            "scoreBreakdown": {
                key: value
                for key, value in score_breakdown.items()
                if not key.startswith("_")
            },
            "adScore": ad_score,
            "adSuspicionScore": ad_score,
            "placeScore": place_score,
            "foreignerScore": foreigner_score,
            "informationScore": place_score,
            "reviewInformationScore": review_information_score,
            "reviewInformationLevel": review_information_level,
            "grade": cls.grade(total_score),
            "trustGrade": cls.trust_grade(trust_level_key, language),
            "trustLevelKey": trust_level_key,
            "adSuspicion": cls.ad_suspicion(ad_suspicion_level, language),
            "adSuspicionLevel": ad_suspicion_level,
            "repetitionLevel": repetition_level,
            "informationCompleteness": cls.information_completeness(information_level),
            "positiveSignals": positive_signals,
            "negativeSignals": negative_signals,
            "warningSignals": warning_signals,
            "globalAccessibilityScore": foreigner_score,
            "globalAccessibilityLevel": global_accessibility_level,
            "globalAccessibilityMaxScore": 100,
            "globalAccessibilityChecks": cls.global_accessibility_checks(payload),
            "detectedPatterns": detected_patterns,
            "suspiciousPhrases": evidence.suspiciousPhrases,
            "repetitivePhrases": evidence.repetitivePhrases,
            "informationLevel": information_level,
            "summary": cls._short_text(data.get("summary"), 220, language),
            "recommendation": cls._short_text(data.get("recommendation"), 180, language),
            "visitTip": cls._short_text(data.get("visitTip"), 180, language, fallback_kind="visit_tip"),
            "evidence": evidence.model_dump(),
            "analyzedReviewCount": cls.analyzed_review_count(payload),
            "modelVersion": model_version,
        }

    @classmethod
    def fallback_response_data(cls, payload: ReviewAnalyzeRequest) -> dict[str, Any]:
        language = payload.outputLanguage
        data = {
            "trustScore": 50,
            "adScore": 50,
            "informationLevel": "보통" if language == "ko" else "Moderate",
            "detectedPatterns": [
                "분석 결과를 안정적으로 생성하지 못해 기본 기준으로 표시했습니다."
                if language == "ko"
                else "A stable analysis could not be generated, so default criteria were used."
            ],
            "suspiciousPhrases": [],
            "repetitivePhrases": [],
            "positiveSignals": [],
            "negativeSignals": [
                "최신 리뷰와 병원 기본 정보를 함께 확인하는 것이 좋습니다."
                if language == "ko"
                else "Check recent reviews and basic clinic information together."
            ],
            "summary": (
                "리뷰 분석 결과를 안정적으로 불러오지 못해 기본값으로 표시했습니다."
                if language == "ko"
                else "The review analysis could not be loaded reliably, so default values are shown."
            ),
            "recommendation": (
                "병원 선택 전 최신 리뷰, 비용 안내, 진료 항목을 함께 확인해 주세요."
                if language == "ko"
                else "Before choosing a clinic, check recent reviews, cost guidance, and treatment items together."
            ),
            "visitTip": (
                "예약 전 진료 가능 항목과 방문 준비 사항을 병원에 확인해 보세요."
                if language == "ko"
                else "Before booking, confirm available treatments and visit preparation details with the clinic."
            ),
        }
        return cls.normalize_response_data(data, payload, cls.FALLBACK_MODEL_VERSION)

    @staticmethod
    def merge_review_text(payload: ReviewAnalyzeRequest) -> str:
        pieces = []
        if payload.reviewText and payload.reviewText.strip():
            pieces.append(payload.reviewText.strip())
        pieces.extend(review.strip() for review in payload.reviews if review.strip())
        return "\n\n".join(dict.fromkeys(pieces))

    @staticmethod
    def _review_texts(payload: ReviewAnalyzeRequest) -> list[str]:
        pieces = []
        if payload.reviewText and payload.reviewText.strip():
            pieces.append(payload.reviewText.strip())
        pieces.extend(review.strip() for review in payload.reviews if review.strip())
        return list(dict.fromkeys(pieces))

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
        statuses = OpenAIReviewAnalysisService.global_accessibility_checks(payload)
        weights = {
            "mapLocation": 25,
            "contactBooking": 20,
            "englishGuide": 20,
            "englishName": 10,
            "websitePlaceLink": 10,
            "photoInfo": 10,
            "englishReviews": 5,
        }
        score = sum(weight for key, weight in weights.items() if statuses.get(key) == "confirmed")
        return OpenAIReviewAnalysisService._clamp_score(score)

    @staticmethod
    def calculate_total_score(
        trust_score: int,
        ad_score: int,
        place_score: int,
        foreigner_score: int,
    ) -> int:
        return OpenAIReviewAnalysisService._clamp_score(trust_score)

    @classmethod
    def calculate_review_score_breakdown(
        cls,
        *,
        payload: ReviewAnalyzeRequest,
        data: dict[str, Any],
        evidence: ReviewEvidence,
        base_trust_score: int,
        ad_score: int,
        review_information_score: int,
    ) -> dict[str, Any]:
        review_texts = cls._review_texts(payload)
        review_count = max(len(review_texts), 1)
        merged_text = "\n".join(review_texts)
        promo_signal_score = cls.calculate_promo_signal_score(review_texts)
        repetition_score = cls.calculate_repetition_score(data.get("repetitionLevel"), evidence.repetitivePhrases, review_count)
        exaggeration_score = cls.calculate_context_score(review_texts, ["최고", "대박", "완벽", "무조건", "best", "perfect", "amazing"])
        event_discount_score = cls.calculate_context_score(review_texts, ["할인", "이벤트", "혜택", "무료", "discount", "event", "promotion", "free"])
        review_burst_score = cls.calculate_review_burst_score(payload.reviewDates)
        risk_parts = [
            (promo_signal_score, 0.40),
            (repetition_score, 0.25),
            (exaggeration_score, 0.15),
            (event_discount_score, 0.10),
        ]
        if review_burst_score is not None:
            risk_parts.append((review_burst_score, 0.10))
        risk_score = cls._weighted_average(risk_parts)
        specificity_score = cls.calculate_specificity_score(merged_text, evidence.specificPhrases, review_count)
        balance_score = cls.calculate_balance_score(data, evidence)
        diversity_score = cls.calculate_diversity_score(review_texts, repetition_score)
        informative_score = cls._clamp_score(review_information_score)
        naturalness_score = cls._clamp_score(100 - max(promo_signal_score, int(exaggeration_score * 0.75)))
        evidence_score = cls._clamp_score(
            specificity_score * 0.35
            + balance_score * 0.20
            + diversity_score * 0.20
            + informative_score * 0.15
            + naturalness_score * 0.10
        )
        review_trust_score = cls._clamp_score(evidence_score * 0.70 + (100 - risk_score) * 0.30)
        review_trust_score = cls.apply_review_trust_caps(
            review_trust_score=review_trust_score,
            review_count=review_count,
            risk_score=risk_score,
            repetition_score=repetition_score,
            specificity_score=specificity_score,
            evidence_score=evidence_score,
        )
        analysis_confidence = cls.analysis_confidence(
            review_count=review_count,
            diversity_score=diversity_score,
            review_burst_score=review_burst_score,
            repetition_score=repetition_score,
        )

        return {
            "_evidence": evidence,
            "baseTrustScore": base_trust_score,
            "reviewTrustScore": review_trust_score,
            "evidenceScore": evidence_score,
            "riskScore": risk_score,
            "specificityScore": specificity_score,
            "balanceScore": balance_score,
            "diversityScore": diversity_score,
            "informativeScore": informative_score,
            "naturalnessScore": naturalness_score,
            "promoSignalScore": promo_signal_score,
            "repetitionScore": repetition_score,
            "exaggerationScore": exaggeration_score,
            "eventDiscountScore": event_discount_score,
            "reviewBurstScore": review_burst_score,
            "reviewBurstStatus": "available" if review_burst_score is not None else "unavailable",
            "analysisConfidence": analysis_confidence,
        }

    @classmethod
    def calculate_promo_signal_score(cls, review_texts: list[str]) -> int:
        if not review_texts:
            return 0

        weighted_hits = 0.0
        repeated_terms: Counter[str] = Counter()
        for text in review_texts:
            for sentence in cls._sentences(text):
                lowered = sentence.lower()
                if cls._has_negation_context(lowered):
                    continue

                matched_terms = [term for term in cls.PROMO_TERMS if term.lower() in lowered]
                if not matched_terms:
                    continue

                has_action = any(term.lower() in lowered for term in cls.ACTION_TERMS)
                weight = 1.0 + (0.65 if has_action else 0)
                if len(matched_terms) >= 2:
                    weight += 0.35
                weighted_hits += weight
                repeated_terms.update(term.lower() for term in matched_terms)

        repeated_boost = sum(10 for count in repeated_terms.values() if count >= 2)
        score = (weighted_hits / max(len(review_texts), 1)) * 32 + repeated_boost
        return cls._clamp_score(score)

    @classmethod
    def calculate_context_score(cls, review_texts: list[str], terms: list[str]) -> int:
        if not review_texts:
            return 0

        weighted_hits = 0.0
        term_counts: Counter[str] = Counter()
        for text in review_texts:
            for sentence in cls._sentences(text):
                lowered = sentence.lower()
                if cls._has_negation_context(lowered):
                    continue
                matched_terms = [term for term in terms if term.lower() in lowered]
                if not matched_terms:
                    continue
                term_counts.update(term.lower() for term in matched_terms)
                weighted_hits += 1 + (0.5 if any(term.lower() in lowered for term in cls.ACTION_TERMS) else 0)

        repeated_boost = sum(8 for count in term_counts.values() if count >= 2)
        return cls._clamp_score((weighted_hits / max(len(review_texts), 1)) * 28 + repeated_boost)

    @classmethod
    def calculate_review_burst_score(cls, review_dates: list[str]) -> int | None:
        dates = sorted(cls._parse_review_dates(review_dates))
        if len(dates) < 2:
            return None

        total = len(dates)
        max_7_day = cls._max_window_count(dates, 7) / total
        max_14_day = cls._max_window_count(dates, 14) / total
        if max_7_day < 0.50 and max_14_day < 0.60:
            return 0

        seven_day_score = max(0, (max_7_day - 0.30) / 0.70 * 100)
        fourteen_day_score = max(0, (max_14_day - 0.40) / 0.60 * 100)
        return cls._clamp_score(max(seven_day_score, fourteen_day_score))

    @staticmethod
    def _parse_review_dates(review_dates: list[str]):
        parsed = []
        for raw_date in review_dates:
            text = str(raw_date or "").strip()
            if not text:
                continue
            candidates = [text, text[:10], text.replace(".", "-").replace("/", "-")[:10]]
            for candidate in candidates:
                try:
                    parsed.append(datetime.fromisoformat(candidate).date())
                    break
                except ValueError:
                    continue
        return parsed

    @staticmethod
    def _max_window_count(dates, days: int) -> int:
        max_count = 0
        for start_index, start_date in enumerate(dates):
            count = 0
            for current_date in dates[start_index:]:
                if (current_date - start_date).days <= days - 1:
                    count += 1
            max_count = max(max_count, count)
        return max_count

    @classmethod
    def calculate_specificity_score(cls, text: str, specific_phrases: list[str], review_count: int) -> int:
        keyword_count = sum(1 for keyword in cls.CONCRETE_KEYWORDS if keyword.lower() in text.lower())
        signal_count = len(set(specific_phrases)) + keyword_count
        return cls._clamp_score((signal_count / max(review_count, 1)) * 28)

    @classmethod
    def calculate_repetition_score(cls, level: Any, repetitive_phrases: list[str], review_count: int) -> int:
        normalized = str(level or "").strip().lower()
        level_score = {"high": 75, "medium": 45, "low": 15}.get(normalized, 15)
        phrase_score = min(100, len(set(repetitive_phrases)) / max(review_count, 1) * 55)
        return cls._clamp_score(max(level_score, phrase_score))

    @classmethod
    def calculate_balance_score(cls, data: dict[str, Any], evidence: ReviewEvidence) -> int:
        positive_count = len(evidence.positiveSignals)
        caution_count = len(evidence.warnings) + len(cls._normalize_string_list(data.get("negativeSignals")))
        if positive_count and caution_count:
            return 82
        if positive_count or caution_count:
            return 58
        return 45

    @staticmethod
    def calculate_diversity_score(review_texts: list[str], repetition_score: int) -> int:
        if not review_texts:
            return 0
        normalized_reviews = [re.sub(r"\s+", " ", review.strip().lower()) for review in review_texts if review.strip()]
        unique_ratio = len(set(normalized_reviews)) / max(len(normalized_reviews), 1)
        token_sets = [set(re.findall(r"[가-힣A-Za-z0-9]{2,}", review)) for review in normalized_reviews]
        token_variety = len(set().union(*token_sets)) / max(sum(len(tokens) for tokens in token_sets), 1)
        score = unique_ratio * 58 + min(token_variety * 100, 32) + (100 - repetition_score) * 0.10
        return OpenAIReviewAnalysisService._clamp_score(score)

    @staticmethod
    def apply_review_trust_caps(
        *,
        review_trust_score: int,
        review_count: int,
        risk_score: int,
        repetition_score: int,
        specificity_score: int,
        evidence_score: int,
    ) -> int:
        caps = []
        if review_count < 5:
            caps.append(60)
        elif review_count < 10:
            caps.append(75)
        elif review_count < 20:
            caps.append(85)
        else:
            caps.append(92)
        if risk_score >= 80:
            caps.append(70)
        elif risk_score >= 65:
            caps.append(78)
        if repetition_score >= 70:
            caps.append(75)
        if specificity_score < 40:
            caps.append(68)
        if evidence_score < 45:
            caps.append(65)
        return min(review_trust_score, *caps)

    @staticmethod
    def analysis_confidence(
        *,
        review_count: int,
        diversity_score: int,
        review_burst_score: int | None,
        repetition_score: int,
    ) -> str:
        if review_count >= 20 and diversity_score >= 60 and (review_burst_score is None or review_burst_score < 50):
            return "high"
        if review_count >= 10 and repetition_score < 70:
            return "medium"
        return "low"

    @staticmethod
    def analysis_confidence_description(level: str, language: str) -> str:
        if language == "en":
            if level == "high":
                return "There are enough reviews and the wording is relatively varied."
            if level == "medium":
                return "There are enough reviews, but some repeated or concentrated signals may exist."
            return "There are too few reviews or repeated expressions are relatively strong."
        if level == "high":
            return "분석 가능한 리뷰가 충분하고 표현도 비교적 다양해요."
        if level == "medium":
            return "리뷰 수는 충분하지만, 일부 항목에서 반복/집중 신호가 있을 수 있어요."
        return "리뷰 수가 적거나 특정 표현이 과도하게 반복되어 신뢰도 해석에 주의가 필요해요."

    @classmethod
    def _sentences(cls, text: str) -> list[str]:
        return [sentence.strip() for sentence in re.split(r"[\n.!?。！？]+", text) if sentence.strip()]

    @classmethod
    def _has_negation_context(cls, text: str) -> bool:
        return any(term in text for term in cls.NEGATION_TERMS)

    @staticmethod
    def _weighted_average(parts: list[tuple[int, float]]) -> int:
        total_weight = sum(weight for _, weight in parts)
        if total_weight <= 0:
            return 0
        score = sum(value * weight for value, weight in parts) / total_weight
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
        if score >= 90:
            return "very_safe"
        if score >= 75:
            return "safe"
        if score >= 60:
            return "normal"
        if score >= 45:
            return "caution"
        return "danger"

    @staticmethod
    def ad_suspicion_level(score: int) -> str:
        if score >= 70:
            return "높음"
        if score >= 40:
            return "보통"
        return "낮음"

    @staticmethod
    def score_level(score: int) -> str:
        if score >= 70:
            return "높음"
        if score >= 40:
            return "보통"
        return "낮음"

    @staticmethod
    def information_level(score: int) -> str:
        if score >= 70:
            return "충분"
        if score >= 40:
            return "보통"
        return "부족"

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
        labels = {
            "very_safe": "매우 안전",
            "safe": "안전",
            "normal": "보통",
            "caution": "주의",
            "danger": "위험",
            "very_high": "매우 안전",
            "high": "안전",
            "medium": "보통",
            "low": "주의",
            "very_low": "위험",
        }
        return labels.get(level_key, labels["normal"])

    @staticmethod
    def ad_suspicion(level_key: str, language: str) -> str:
        labels = {"low": "낮음", "medium": "보통", "high": "높음", "낮음": "낮음", "보통": "보통", "높음": "높음"}
        return labels.get(level_key, labels["보통"])

    @staticmethod
    def information_completeness(information_level: str) -> str:
        if information_level in {"충분", "매우 구체적", "구체적", "Very specific", "Specific"}:
            return "high"
        if information_level in {"부족", "정보 부족", "매우 부족", "Limited", "Very limited"}:
            return "low"
        return "medium"

    @staticmethod
    def global_accessibility_score(foreigner_score: int) -> int:
        return OpenAIReviewAnalysisService._clamp_score(foreigner_score)

    @staticmethod
    def global_accessibility_checks(payload: ReviewAnalyzeRequest) -> dict[str, str]:
        place_link = payload.homepageUrl or payload.naverPlaceUrl or payload.kakaoPlaceUrl or payload.googleMapUrl
        map_signal = (
            payload.address
            or payload.roadAddress
            or payload.googleMapUrl
            or payload.googleRegistered
            or payload.naverPlaceUrl
            or payload.kakaoPlaceUrl
            or payload.googlePlaceId
            or payload.externalPlaceId
            or (payload.latitude is not None and payload.longitude is not None)
        )
        map_context_exists = any(
            OpenAIReviewAnalysisService._has_context_value(value)
            for value in [
                payload.address,
                payload.roadAddress,
                payload.googleMapUrl,
                payload.googleRegistered,
                payload.naverPlaceUrl,
                payload.kakaoPlaceUrl,
                payload.googlePlaceId,
                payload.externalPlaceId,
                payload.latitude,
                payload.longitude,
            ]
        )
        contact_booking = payload.phone or payload.homepageUrl
        review_text = OpenAIReviewAnalysisService.merge_review_text(payload)
        english_guide = payload.hasEnglishInfo
        if english_guide is None:
            english_guide = (
                OpenAIReviewAnalysisService._has_english_guidance_signal(payload.description)
                or OpenAIReviewAnalysisService._has_english_guidance_signal(review_text)
            )
        photo_info = payload.hasGooglePhotos or payload.hasPhotos
        english_guide_context_exists = (
            payload.hasEnglishInfo is not None
            or OpenAIReviewAnalysisService._has_context_value(payload.description)
            or OpenAIReviewAnalysisService._has_english_guidance_context(review_text)
        )

        return {
            "mapLocation": OpenAIReviewAnalysisService._check_status(map_signal, has_context=map_context_exists),
            "contactBooking": OpenAIReviewAnalysisService._check_status(contact_booking, has_context=bool(payload.phone or place_link)),
            "websitePlaceLink": OpenAIReviewAnalysisService._check_status(place_link, has_context=bool(place_link or payload.sourceProvider)),
            "photoInfo": OpenAIReviewAnalysisService._check_status(photo_info, has_context=payload.hasGooglePhotos is not None or payload.hasPhotos is not None),
            "englishName": OpenAIReviewAnalysisService._check_status(payload.englishName, has_context=payload.englishName is not None),
            "englishGuide": OpenAIReviewAnalysisService._check_status(english_guide, has_context=english_guide_context_exists),
            "englishReviews": OpenAIReviewAnalysisService._check_status(payload.hasEnglishReviews, has_context=payload.hasEnglishReviews is not None),
        }

    @staticmethod
    def _has_context_value(value: Any) -> bool:
        if value is None:
            return False
        if isinstance(value, str):
            return bool(value.strip())
        return True

    @staticmethod
    def _check_status(value: Any, *, has_context: bool) -> str:
        if isinstance(value, bool):
            return "confirmed" if value else ("notConfirmed" if has_context else "unknown")
        if value:
            return "confirmed"
        return "unknown" if not has_context else "notConfirmed"

    @staticmethod
    def _has_english_guidance_signal(value: Any) -> bool:
        text = str(value or "").lower()
        if not text:
            return False
        if any(re.search(pattern, text) for pattern in OpenAIReviewAnalysisService.ENGLISH_GUIDANCE_NEGATIVE_PATTERNS):
            return False
        return any(keyword in text for keyword in OpenAIReviewAnalysisService.ENGLISH_GUIDANCE_KEYWORDS)

    @staticmethod
    def _has_english_guidance_context(value: Any) -> bool:
        text = str(value or "").lower()
        if not text:
            return False
        return any(keyword in text for keyword in OpenAIReviewAnalysisService.ENGLISH_GUIDANCE_KEYWORDS) or any(
            re.search(pattern, text) for pattern in OpenAIReviewAnalysisService.ENGLISH_GUIDANCE_NEGATIVE_PATTERNS
        )

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
        source = value if isinstance(value, dict) else {}
        data = source.get("evidence") if isinstance(source.get("evidence"), dict) else source
        suspicious_phrases = (
            OpenAIReviewAnalysisService._normalize_string_list(source.get("suspiciousPhrases"))
            or OpenAIReviewAnalysisService._normalize_string_list(data.get("suspiciousPhrases"))
        )
        repetitive_phrases = (
            OpenAIReviewAnalysisService._normalize_string_list(source.get("repetitivePhrases"))
            or OpenAIReviewAnalysisService._normalize_string_list(data.get("repetitivePhrases"))
        )
        positive_signals = (
            OpenAIReviewAnalysisService._normalize_string_list(source.get("positiveSignals"))
            or OpenAIReviewAnalysisService._normalize_string_list(data.get("positiveSignals"))
        )
        warnings = (
            OpenAIReviewAnalysisService._normalize_string_list(source.get("negativeSignals"))
            or OpenAIReviewAnalysisService._normalize_string_list(source.get("warningSignals"))
            or OpenAIReviewAnalysisService._normalize_string_list(data.get("warnings"))
        )
        evidence = ReviewEvidence(
            suspiciousPhrases=suspicious_phrases,
            specificPhrases=OpenAIReviewAnalysisService._normalize_string_list(data.get("specificPhrases")),
            repetitivePhrases=repetitive_phrases,
            warnings=warnings,
            positiveSignals=positive_signals,
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
    def _information_score(value: Any, level: Any) -> int:
        if value is not None:
            return OpenAIReviewAnalysisService._clamp_score(value)

        normalized = str(level or "").strip().lower()
        level_scores = {
            "충분": 80,
            "매우 구체적": 90,
            "구체적": 75,
            "very specific": 90,
            "specific": 75,
            "보통": 55,
            "moderate": 55,
            "부족": 30,
            "정보 부족": 35,
            "매우 부족": 20,
            "limited": 35,
            "very limited": 20,
        }
        return level_scores.get(normalized, 50)

    @staticmethod
    def _normalize_level(value: Any) -> str:
        normalized = str(value or "").strip().lower()
        if normalized in {"low", "medium", "high"}:
            return normalized
        return "low"

    @staticmethod
    def _repetition_level(value: Any, repetitive_phrases: list[str]) -> str:
        normalized = str(value or "").strip().lower()
        if normalized in {"low", "medium", "high"}:
            return normalized
        if len(repetitive_phrases) >= 4:
            return "high"
        if len(repetitive_phrases) >= 2:
            return "medium"
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
    def _short_text(value: Any, max_length: int, language: str, fallback_kind: str = "summary") -> str:
        text = str(value or "").strip()
        if not text:
            fallbacks = {
                "summary": (
                    "리뷰의 구체성, 광고성으로 보일 수 있는 표현, 반복 패턴을 기준으로 분석했습니다."
                    if language == "ko"
                    else "The review was analyzed by concreteness, promotional-looking wording, and repetition."
                ),
                "visit_tip": (
                    "방문 전 비용, 진료 항목, 예약 방식을 함께 확인해 보세요."
                    if language == "ko"
                    else "Before visiting, check cost guidance, treatment items, and booking method together."
                ),
            }
            return fallbacks.get(fallback_kind, fallbacks["summary"])
        return text[:max_length]
