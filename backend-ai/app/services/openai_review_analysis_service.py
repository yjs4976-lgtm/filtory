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
from app.schemas.review_analysis_schema import ReviewAnalyzeRequest, ReviewAnalyzeResponse, ReviewEvidence, ReviewMentionedAspects

logger = logging.getLogger(__name__)


class OpenAIReviewAnalysisService:
    # OpenAI가 맡는 일은 리뷰 문장의 판단 근거를 추출하는 것이다.
    # 최종 점수, 등급, 응답 호환 필드는 이 서비스의 normalize_response_data()에서 서버 규칙으로 다시 계산한다.
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
        "강추",
        "무조건 추천",
        "꼭 가세요",
        "지인 추천",
        "협찬",
        "체험단",
        "recommended by a friend",
        "must go",
        "highly recommend",
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
        "영어로 설명",
        "영어 설명",
        "영어 상담",
        "영어 응대",
        "영어 안내",
        "영어 가능",
        "영어 진료",
        "영어를 잘",
        "통역 가능",
        "통역 지원",
        "외국어 안내",
        "외국인 진료 가능",
        "english support",
        "english service",
        "english available",
        "english-speaking",
        "spoke english",
        "speaks english",
        "explained everything in english",
        "explained in english",
        "consultation in english",
        "english consultation",
        "interpreter available",
        "interpretation available",
        "translation support",
        "multilingual staff",
    ]
    ENGLISH_GUIDANCE_NEGATIVE_PATTERNS = [
        r"영어.{0,8}(없|불가|안\s*됨|지원하지|안\s*해|못\s*해)",
        r"외국인.{0,12}(진료|응대|안내|지원).{0,8}(없|불가|안\s*됨|지원하지)",
        r"(no|not|without).{0,32}(english|interpreter|interpretation|translation)",
        r"(english|interpreter|interpretation|translation).{0,32}(not\s+available|unavailable|unsupported|not\s+supported|no\s+support)",
        r"(foreigner|international).{0,16}(support|service|guidance|assistance).{0,16}(not\s+available|unavailable|unsupported|not\s+supported)",
    ]
    LOCATION_ACCESS_KEYWORDS = [
        "역에서 가까",
        "찾기 쉬",
        "찾아가기 쉬",
        "위치가 좋",
        "교통이 편",
        "near the station",
        "easy to find",
        "easy to get to",
        "convenient location",
    ]
    LOCATION_ACCESS_NEGATIVE_PATTERNS = [
        r"(찾기|찾아가기).{0,10}(어렵|힘들)",
        r"위치.{0,10}(불편|멀)",
        r"(hard|difficult).{0,20}(find|get to)",
    ]
    BOOKING_ACCESS_KEYWORDS = [
        "전화로 예약",
        "예약했",
        "예약이 가능",
        "문의했",
        "전화 문의",
        "booked by phone",
        "made a reservation",
        "called to book",
        "booking was available",
    ]
    BOOKING_ACCESS_NEGATIVE_PATTERNS = [
        r"예약.{0,12}(안\s*됨|불가|어렵|못\s*했|취소|거절)",
        r"전화.{0,12}(안\s*받|연결.{0,8}안|연결.{0,8}못)",
        r"(문의|연락).{0,12}(답변|응답).{0,8}(없|못|안)",
        r"(booking|reservation).{0,20}(not available|unavailable|difficult|failed|cancelled|canceled|rejected)",
        r"(contact|inquiry).{0,20}(no response|not answered|unanswered)",
    ]
    PHOTO_REFERENCE_KEYWORDS = [
        "사진과 실제",
        "사진이랑 비슷",
        "내부 사진",
        "시설 사진",
        "photo matched",
        "photos matched",
        "interior photos",
        "clinic photos",
    ]
    PHOTO_REFERENCE_NEGATIVE_PATTERNS = [
        r"사진.{0,8}(없|부족|다르)",
        r"(no|not enough).{0,20}photos?",
        r"photos?.{0,20}(missing|different)",
    ]

    @classmethod
    def analyze(cls, payload: ReviewAnalyzeRequest, settings: Settings) -> ReviewAnalyzeResponse:
        # OpenAI Responses API에 JSON schema를 강제해 응답 구조가 흔들리지 않게 한다.
        # 실패하면 같은 응답 모델을 만족하는 안전 fallback을 반환한다.
        if not settings.openai_api_key:
            raise RuntimeError("OPENAI_API_KEY is not configured")
        if not settings.openai_review_model:
            raise RuntimeError("OPENAI_REVIEW_MODEL is not configured")

        try:
            from openai import OpenAI
        except ImportError as exc:
            raise RuntimeError("openai package is not installed") from exc

        # OpenAI SDK Client 객체에 timeout/max_retries를 지정해 요청 단위 동작을 고정한다.
        client = OpenAI(
            api_key=settings.openai_api_key,
            timeout=settings.openai_timeout_seconds,
            max_retries=0,
        )
        try:
            # responses.create()는 OpenAI Responses API 호출이다.
            # text.format에 json_schema를 넣으면 모델 출력이 지정한 JSON schema를 따라야 한다.
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
        # 프롬프트에는 카테고리, 병원명, 리뷰 원문, 출력 언어만 넣고 민감한 회원 정보는 보내지 않는다.
        review_text = OpenAIReviewAnalysisService.merge_review_text(payload)
        return REVIEW_ANALYSIS_USER_PROMPT_TEMPLATE.format(
            category=payload.category,
            hospital_name=payload.hospitalName or "미입력",
            review_text=review_text,
            output_language=payload.outputLanguage,
        ).strip()

    @staticmethod
    def _extract_output_text(response: Any) -> str:
        # 최신 OpenAI SDK는 output_text shortcut을 제공하지만, 없을 때는 model_dump()로 원본 구조를 순회한다.
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
        # 모델이 JSON 앞뒤에 code fence나 설명을 붙여도 가능한 범위에서 JSON 객체만 복구한다.
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
        # OpenAI 원응답은 trustScore/adScore/evidence 같은 최소 판단만 믿고,
        # placeScore, foreignerScore, totalScore, analyzedReviewCount, modelVersion은 서버가 확정한다.
        if not isinstance(data, dict):
            raise ValueError("OpenAI response JSON must be an object")

        language = payload.outputLanguage
        base_trust_score = cls._clamp_score(data.get("trustScore"))
        ad_score = cls._clamp_score(data.get("adScore", data.get("adSuspicionScore")))
        review_information_score = cls._information_score(data.get("informationScore"), data.get("informationLevel"))
        place_score = cls.calculate_place_score(payload)
        foreigner_score = cls.calculate_foreigner_score(payload)
        review_texts = cls._review_texts(payload)
        specificity_signals = cls._normalize_signal_list(data.get("specificitySignals"))
        promo_signals = cls._normalize_signal_list(data.get("promoSignals"))
        repetition_signals = cls._normalize_signal_list(data.get("repetitionSignals"))
        exaggeration_signals = cls._normalize_signal_list(data.get("exaggerationSignals"))
        balanced_experience_signals = cls._normalize_signal_list(data.get("balancedExperienceSignals"))
        mentioned_aspects = cls._normalize_mentioned_aspects(data.get("mentionedAspects"), review_texts)
        score_breakdown = cls.calculate_review_score_breakdown(
            payload=payload,
            data=data,
            evidence=cls._normalize_evidence(data, language),
            base_trust_score=base_trust_score,
            ad_score=ad_score,
            review_information_score=review_information_score,
            specificity_signals=specificity_signals,
            promo_signals=promo_signals,
            repetition_signals=repetition_signals,
            exaggeration_signals=exaggeration_signals,
            balanced_experience_signals=balanced_experience_signals,
            mentioned_aspects=mentioned_aspects,
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
            "specificitySignals": specificity_signals,
            "promoSignals": promo_signals,
            "repetitionSignals": repetition_signals,
            "exaggerationSignals": exaggeration_signals,
            "balancedExperienceSignals": balanced_experience_signals,
            "mentionedAspects": mentioned_aspects.model_dump(),
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
        # OpenAI 호출 실패 시 사용자에게 에러 페이지 대신 보수적인 기본 분석 결과를 보여주기 위한 응답이다.
        # 이 fallback도 normalize_response_data()를 거쳐 실제 응답과 같은 key를 가진다.
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
        return "\n\n".join(OpenAIReviewAnalysisService._review_texts(payload))

    @staticmethod
    def _review_texts(payload: ReviewAnalyzeRequest) -> list[str]:
        if any(review.strip() for review in payload.reviews):
            return list(dict.fromkeys(
                cleaned
                for review in payload.reviews
                if (cleaned := OpenAIReviewAnalysisService._strip_owner_reply_text(review))
            ))
        return OpenAIReviewAnalysisService._split_review_text(payload.reviewText)

    @staticmethod
    def analyzed_review_count(payload: ReviewAnalyzeRequest) -> int:
        return len(OpenAIReviewAnalysisService._review_texts(payload))

    @staticmethod
    def _split_review_text(value: str | None) -> list[str]:
        text = str(value or "").replace("\r\n", "\n").strip()
        if not text:
            return []
        paragraph_parts = [part.strip() for part in re.split(r"\n\s*\n+", text) if part.strip()]
        if len(paragraph_parts) > 1:
            return list(dict.fromkeys(
                cleaned
                for part in paragraph_parts
                if (cleaned := OpenAIReviewAnalysisService._strip_owner_reply_text(part))
            ))
        return list(dict.fromkeys(
            cleaned
            for part in text.splitlines()
            if (cleaned := OpenAIReviewAnalysisService._strip_owner_reply_text(part))
        ))

    @staticmethod
    def _strip_owner_reply_text(value: str | None) -> str:
        text = str(value or "").replace("\r\n", "\n").strip()
        if not text:
            return ""
        marker_pattern = re.compile(
            r"^\s*(병원\s*측|병원|업체|매장|원장님?|의사|관리자|사장님|클리닉)\s*(?:의|측)?\s*(?:답변|답글|댓글)\s*[:：]?\s*$"
            r"|^\s*(?:답변|답글)\s*[:：]\s*(?:병원|업체|관리자|사장님|클리닉)\s*$"
            r"|^\s*(?:owner|business|clinic|hospital)\s*(?:reply|response)\s*[:：]?\s*$",
            re.IGNORECASE,
        )
        kept_lines = []
        for line in text.split("\n"):
            if marker_pattern.search(line):
                break
            kept_lines.append(line)
        return "\n".join(kept_lines).strip()

    @staticmethod
    def calculate_place_score(payload: ReviewAnalyzeRequest) -> int:
        # 병원 정보 완성도 점수다. 리뷰 신뢰도에는 섞지 않고 결과 화면의 정보 확인 항목에 사용한다.
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
        # 외국인 방문 준비도 점수다. 지도/연락처/영어 정보/사진 같은 방문 전 확인 단서를 기준으로 한다.
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
        # 리뷰 신뢰도 점수는 병원 정보나 외국인 방문 준비도에 끌려가지 않도록 별도로 유지한다.
        # place_score, foreigner_score는 결과 화면의 참고 정보로만 보여준다.
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
        specificity_signals: list[dict[str, str]] | None = None,
        promo_signals: list[dict[str, str]] | None = None,
        repetition_signals: list[dict[str, str]] | None = None,
        exaggeration_signals: list[dict[str, str]] | None = None,
        balanced_experience_signals: list[dict[str, str]] | None = None,
        mentioned_aspects: ReviewMentionedAspects | None = None,
    ) -> dict[str, Any]:
        review_texts = cls._review_texts(payload)
        review_count = max(len(review_texts), 1)
        merged_text = "\n".join(review_texts)
        specificity_signals = specificity_signals or []
        promo_signals = promo_signals or []
        repetition_signals = repetition_signals or []
        exaggeration_signals = exaggeration_signals or []
        balanced_experience_signals = balanced_experience_signals or []
        mentioned_aspects = mentioned_aspects or ReviewMentionedAspects()
        promo_signal_score = max(
            cls.calculate_promo_signal_score(review_texts),
            cls.calculate_structured_signal_score(promo_signals, review_count),
        )
        repetition_score = max(
            cls.calculate_repetition_score(data.get("repetitionLevel"), evidence.repetitivePhrases, review_count),
            cls.calculate_structured_signal_score(repetition_signals, review_count),
        )
        exaggeration_score = max(
            cls.calculate_context_score(review_texts, ["최고", "대박", "완벽", "무조건", "best", "perfect", "amazing"]),
            cls.calculate_structured_signal_score(exaggeration_signals, review_count),
        )
        event_discount_score = cls.calculate_context_score(review_texts, ["할인", "이벤트", "혜택", "무료", "discount", "event", "promotion", "free"])
        review_burst_score = cls.calculate_review_burst_score(payload.reviewDates)
        # 광고성 위험은 광고 문구, 반복 표현, 과장 표현, 이벤트/할인 표현을 나눠 계산한다.
        # 같은 문맥을 한 덩어리로 합치지 않아 리뷰별 긍정/부정 맥락이 서로 덮어쓰지 않게 한다.
        risk_parts = [
            (promo_signal_score, 0.40),
            (repetition_score, 0.25),
            (exaggeration_score, 0.15),
            (event_discount_score, 0.10),
        ]
        if review_burst_score is not None:
            risk_parts.append((review_burst_score, 0.10))
        risk_score = cls._weighted_average(risk_parts)
        specificity_score = max(
            cls.calculate_specificity_score(merged_text, evidence.specificPhrases, review_count),
            cls.calculate_structured_specificity_score(specificity_signals, mentioned_aspects, review_count),
        )
        balance_score = cls.calculate_balance_score(data, evidence, balanced_experience_signals)
        diversity_score = cls.calculate_diversity_score(review_texts, repetition_score)
        informative_score = cls._clamp_score(review_information_score)
        naturalness_score = cls._clamp_score(100 - max(promo_signal_score, int(exaggeration_score * 0.75)))
        # 리뷰 신뢰도는 리뷰 자체의 근거성/다양성/자연스러움만 본다.
        # 병원 정보 완성도나 외국인 방문 준비도는 이 점수에 섞지 않는다.
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
            "specificitySignalCount": len(specificity_signals),
            "promoSignalCount": len(promo_signals),
            "repetitionSignalCount": len(repetition_signals),
            "exaggerationSignalCount": len(exaggeration_signals),
            "balancedExperienceSignalCount": len(balanced_experience_signals),
            "costMentioned": mentioned_aspects.costMentioned,
            "waitingMentioned": mentioned_aspects.waitingMentioned,
            "treatmentProcessMentioned": mentioned_aspects.treatmentProcessMentioned,
            "aftercareMentioned": mentioned_aspects.aftercareMentioned,
        }

    @classmethod
    def calculate_structured_signal_score(cls, signals: list[dict[str, str]], review_count: int) -> int:
        if not signals:
            return 0
        strength_weights = {"low": 12, "medium": 24, "strong": 38}
        score = sum(strength_weights.get(str(signal.get("strength") or "").strip().lower(), 24) for signal in signals)
        return cls._clamp_score(score / max(review_count, 1))

    @classmethod
    def calculate_structured_specificity_score(
        cls,
        signals: list[dict[str, str]],
        mentioned_aspects: ReviewMentionedAspects,
        review_count: int,
    ) -> int:
        aspect_count = sum(
            [
                mentioned_aspects.costMentioned,
                mentioned_aspects.waitingMentioned,
                mentioned_aspects.treatmentProcessMentioned,
                mentioned_aspects.aftercareMentioned,
            ]
        )
        signal_score = cls.calculate_structured_signal_score(signals, review_count)
        aspect_score = cls._clamp_score((aspect_count / 4) * 72)
        return cls._clamp_score(max(signal_score, aspect_score))

    @classmethod
    def calculate_promo_signal_score(cls, review_texts: list[str]) -> int:
        # 광고성 점수는 "광고"라는 단어만 보지 않고 추천 행동 유도 표현과 반복 정도를 함께 본다.
        # 부정 문맥("광고 같지는 않았다")은 먼저 제외한다.
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
        # 리뷰 날짜가 있을 때만 짧은 기간에 리뷰가 몰린 정도를 계산한다.
        # 날짜 정보가 없으면 점수를 만들지 않고 unavailable로 남긴다.
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
    def calculate_balance_score(cls, data: dict[str, Any], evidence: ReviewEvidence, balanced_experience_signals: list[dict[str, str]] | None = None) -> int:
        positive_count = len(evidence.positiveSignals)
        caution_count = len(evidence.warnings) + len(cls._normalize_string_list(data.get("negativeSignals")))
        if balanced_experience_signals or (positive_count and caution_count):
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
        score = unique_ratio * 68 + min(token_variety * 100, 32)
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
        # 리뷰 수가 너무 적거나 광고/반복/구체성 위험이 크면 최종 신뢰도 상한선을 둔다.
        # 적은 리뷰 몇 개만으로 지나치게 높은 점수가 나오지 않게 하는 안전장치다.
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
        # parts는 (점수, 가중치) tuple 목록이다. 가중치 합으로 나눠 0~100 범위 점수를 만든다.
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
        # 병원 간 비교 정렬에 쓸 예비 점수다. 현재 API 응답에는 직접 노출하지 않는다.
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
        # 외국인 방문 준비도 원천 체크다.
        # 병원 메타데이터와 리뷰 안의 단서를 함께 보되, "영어 안내 없음" 같은 부정 문맥은 confirmed로 보지 않는다.
        review_texts = OpenAIReviewAnalysisService._review_texts(payload)
        place_link = payload.homepageUrl or payload.naverPlaceUrl or payload.kakaoPlaceUrl or payload.googleMapUrl

        location_review_status = OpenAIReviewAnalysisService._contextual_status(
            review_texts,
            OpenAIReviewAnalysisService.LOCATION_ACCESS_KEYWORDS,
            OpenAIReviewAnalysisService.LOCATION_ACCESS_NEGATIVE_PATTERNS,
        )
        booking_review_status = OpenAIReviewAnalysisService._contextual_status(
            review_texts,
            OpenAIReviewAnalysisService.BOOKING_ACCESS_KEYWORDS,
            OpenAIReviewAnalysisService.BOOKING_ACCESS_NEGATIVE_PATTERNS,
        )
        photo_review_status = OpenAIReviewAnalysisService._contextual_status(
            review_texts,
            OpenAIReviewAnalysisService.PHOTO_REFERENCE_KEYWORDS,
            OpenAIReviewAnalysisService.PHOTO_REFERENCE_NEGATIVE_PATTERNS,
        )
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
        map_direct_status = OpenAIReviewAnalysisService._check_status(
            map_signal,
            has_context=map_context_exists,
        )

        contact_signal = payload.phone
        contact_context_exists = OpenAIReviewAnalysisService._has_context_value(payload.phone)
        contact_direct_status = OpenAIReviewAnalysisService._check_status(
            contact_signal,
            has_context=contact_context_exists,
        )

        photo_signal = payload.hasGooglePhotos or payload.hasPhotos
        photo_context_exists = payload.hasGooglePhotos is not None or payload.hasPhotos is not None
        photo_direct_status = OpenAIReviewAnalysisService._check_status(
            photo_signal,
            has_context=photo_context_exists,
        )

        english_context_values = [payload.description, *review_texts]
        english_review_status = OpenAIReviewAnalysisService._contextual_status(
            english_context_values,
            OpenAIReviewAnalysisService.ENGLISH_GUIDANCE_KEYWORDS,
            OpenAIReviewAnalysisService.ENGLISH_GUIDANCE_NEGATIVE_PATTERNS,
        )
        english_direct_status = OpenAIReviewAnalysisService._check_status(
            payload.hasEnglishInfo,
            has_context=payload.hasEnglishInfo is not None,
        )

        return {
            "mapLocation": OpenAIReviewAnalysisService._combine_check_status(map_direct_status, location_review_status),
            "contactBooking": OpenAIReviewAnalysisService._combine_check_status(contact_direct_status, booking_review_status),
            "websitePlaceLink": OpenAIReviewAnalysisService._check_status(place_link, has_context=bool(place_link or payload.sourceProvider)),
            "photoInfo": OpenAIReviewAnalysisService._combine_check_status(
                photo_direct_status,
                photo_review_status,
                prefer_direct_absence=True,
            ),
            "englishName": OpenAIReviewAnalysisService._check_status(payload.englishName, has_context=payload.englishName is not None),
            "englishGuide": OpenAIReviewAnalysisService._combine_check_status(
                english_direct_status,
                english_review_status,
                prefer_direct_absence=True,
            ),
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
    def _contextual_status(values: list[Any], keywords: list[str], negative_patterns: list[str]) -> str:
        positive_count = 0
        negative_count = 0

        for value in values:
            text = str(value or "").strip().lower()
            if not text:
                continue

            has_positive = any(keyword.lower() in text for keyword in keywords)
            has_negative = any(re.search(pattern, text) for pattern in negative_patterns)

            if has_positive:
                positive_count += 1
            if has_negative:
                negative_count += 1

        if positive_count == 0 and negative_count == 0:
            return "unknown"
        if positive_count > negative_count:
            return "confirmed"
        return "notConfirmed"

    @staticmethod
    def _combine_check_status(
        direct_status: str,
        review_status: str,
        *,
        prefer_direct_absence: bool = False,
    ) -> str:
        if prefer_direct_absence and direct_status == "notConfirmed":
            return "notConfirmed"
        if direct_status == "confirmed":
            return "confirmed"
        if review_status == "confirmed":
            return "confirmed"
        if direct_status == "notConfirmed" or review_status == "notConfirmed":
            return "notConfirmed"
        return "unknown"

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
    def _normalize_signal_list(value: Any) -> list[dict[str, str]]:
        if not isinstance(value, list):
            return []
        signals = []
        for item in value[:12]:
            if isinstance(item, dict):
                phrase = str(item.get("phrase") or "").strip()
                signal_type = str(item.get("type") or "").strip()
                reason = str(item.get("reason") or "").strip()
                strength = str(item.get("strength") or "medium").strip().lower()
            else:
                phrase = str(item or "").strip()
                signal_type = ""
                reason = ""
                strength = "medium"
            if not phrase:
                continue
            if strength not in {"low", "medium", "strong"}:
                strength = "medium"
            signals.append(
                {
                    "type": signal_type[:60],
                    "phrase": phrase[:160],
                    "strength": strength,
                    "reason": reason[:180],
                }
            )
        return signals

    @classmethod
    def _normalize_mentioned_aspects(cls, value: Any, review_texts: list[str]) -> ReviewMentionedAspects:
        source = value if isinstance(value, dict) else {}
        merged_text = "\n".join(review_texts).lower()
        return ReviewMentionedAspects(
            costMentioned=bool(source.get("costMentioned")) or cls._contains_any(merged_text, ["비용", "가격", "금액", "cost", "price"]),
            waitingMentioned=bool(source.get("waitingMentioned")) or cls._contains_any(merged_text, ["대기", "기다", "waiting", "waited"]),
            treatmentProcessMentioned=bool(source.get("treatmentProcessMentioned")) or cls._contains_any(
                merged_text,
                ["치료 과정", "시술 과정", "진료 과정", "검사", "처방", "treatment", "procedure", "exam"],
            ),
            aftercareMentioned=bool(source.get("aftercareMentioned")) or cls._contains_any(
                merged_text,
                ["사후관리", "경과", "주의사항", "aftercare", "follow-up", "follow up"],
            ),
        )

    @staticmethod
    def _contains_any(text: str, keywords: list[str]) -> bool:
        return any(keyword.lower() in text for keyword in keywords)

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
