import re
from collections import Counter

from app.schemas.review_analysis_schema import ReviewAnalyzeRequest, ReviewAnalyzeResponse
from app.services.openai_review_analysis_service import OpenAIReviewAnalysisService


class MockReviewAnalysisService:
    MODEL_VERSION = "mock-review-analyzer-v2"

    PROMOTIONAL_KEYWORDS = [
        "광고",
        "협찬",
        "체험단",
        "이벤트",
        "할인",
        "무료",
        "강력 추천",
        "강추",
        "꼭 예약",
        "무조건",
        "최고",
        "대박",
        "완전",
    ]

    CONCRETE_KEYWORDS = [
        "상담",
        "비용",
        "가격",
        "대기",
        "통증",
        "진료",
        "검사",
        "설명",
        "치료 과정",
        "치료",
        "시술",
        "예약",
        "주의사항",
        "경과",
        "처방",
    ]

    @classmethod
    def analyze(cls, payload: ReviewAnalyzeRequest) -> ReviewAnalyzeResponse:
        # Mock 분석도 OpenAI 응답처럼 최소 판단값을 만든 뒤 normalize_response_data를 태운다.
        # 그래야 OpenAI 성공/실패와 관계없이 프론트가 같은 필드를 받는다.
        review_text = OpenAIReviewAnalysisService.merge_review_text(payload)
        promotional_phrases = cls._find_keywords(review_text, cls.PROMOTIONAL_KEYWORDS)
        specific_phrases = cls._find_keywords(review_text, cls.CONCRETE_KEYWORDS)
        repetitive_phrases = cls._find_repetitive_phrases(review_text)
        repetition_level = cls._repetition_level(len(repetitive_phrases))
        trust_score = cls._calculate_trust_score(
            review_text=review_text,
            promotional_count=len(promotional_phrases),
            concrete_count=len(specific_phrases),
            repetitive_count=len(repetitive_phrases),
        )
        ad_score = cls._calculate_ad_score(
            promotional_count=len(promotional_phrases),
            repetitive_count=len(repetitive_phrases),
        )
        information_level = cls._information_level(
            concrete_count=len(specific_phrases),
            review_length=len(review_text),
            language=payload.outputLanguage,
        )

        data = {
            "trustScore": trust_score,
            "adScore": ad_score,
            "repetitionLevel": repetition_level,
            "informationLevel": information_level,
            "summary": cls._summary(
                has_specific=bool(specific_phrases),
                has_promotional=bool(promotional_phrases),
                language=payload.outputLanguage,
            ),
            "recommendation": cls._recommendation(payload.outputLanguage),
            "visitTip": cls._visit_tip(payload.outputLanguage),
            "evidence": {
                "suspiciousPhrases": promotional_phrases[:5],
                "specificPhrases": specific_phrases[:5],
                "repetitivePhrases": repetitive_phrases[:5],
                "warnings": cls._warnings(bool(promotional_phrases), bool(repetitive_phrases), payload.outputLanguage),
                "positiveSignals": cls._positive_signals(bool(specific_phrases), payload.outputLanguage),
                "checkItems": (
                    ["최신 리뷰", "비용 안내", "진료 항목", "예약 방식"]
                    if payload.outputLanguage == "ko"
                    else ["Recent reviews", "Cost guidance", "Treatment items", "Booking method"]
                ),
            },
            "negativeSignals": cls._warnings(bool(promotional_phrases), bool(repetitive_phrases), payload.outputLanguage),
        }
        normalized = OpenAIReviewAnalysisService.normalize_response_data(
            data=data,
            payload=payload,
            model_version=cls.MODEL_VERSION,
        )
        return ReviewAnalyzeResponse.model_validate(normalized)

    @staticmethod
    def _find_keywords(text: str, keywords: list[str]) -> list[str]:
        return [keyword for keyword in keywords if keyword and keyword in text]

    @staticmethod
    def _find_repetitive_phrases(text: str) -> list[str]:
        words = re.findall(r"[가-힣A-Za-z0-9]{2,}", text.lower())
        counts = Counter(words)
        ignored = {"그리고", "그래서", "정말", "있고", "했습니다", "있습니다"}
        return [word for word, count in counts.items() if count >= 3 and word not in ignored]

    @staticmethod
    def _calculate_trust_score(
        review_text: str,
        promotional_count: int,
        concrete_count: int,
        repetitive_count: int,
    ) -> int:
        # 기본 점수에서 구체성은 가산하고, 광고성/반복/너무 짧은 리뷰는 감점한다.
        score = 58
        score += min(concrete_count * 6, 30)
        score -= min(promotional_count * 7, 28)
        score -= min(repetitive_count * 6, 18)
        if len(review_text) < 60:
            score -= 10
        elif len(review_text) >= 180:
            score += 6
        return max(0, min(100, score))

    @staticmethod
    def _calculate_ad_score(promotional_count: int, repetitive_count: int) -> int:
        score = 20 + promotional_count * 14 + repetitive_count * 8
        return max(0, min(100, score))

    @staticmethod
    def _repetition_level(repetitive_count: int) -> str:
        if repetitive_count >= 4:
            return "high"
        if repetitive_count >= 2:
            return "medium"
        return "low"

    @staticmethod
    def _information_level(concrete_count: int, review_length: int, language: str) -> str:
        if concrete_count >= 7 and review_length >= 180:
            return "매우 구체적" if language == "ko" else "Very specific"
        if concrete_count >= 4 and review_length >= 100:
            return "구체적" if language == "ko" else "Specific"
        if concrete_count >= 2:
            return "보통" if language == "ko" else "Moderate"
        if concrete_count == 1:
            return "정보 부족" if language == "ko" else "Limited"
        return "매우 부족" if language == "ko" else "Very limited"

    @staticmethod
    def _summary(has_specific: bool, has_promotional: bool, language: str) -> str:
        if language == "en":
            if has_specific and has_promotional:
                return "The reviews include concrete visit details, while some wording may look promotional."
            if has_specific:
                return "The reviews include concrete details that can help comparison."
            return "The reviews provide limited concrete detail, so additional checks may help."
        if has_specific and has_promotional:
            return "리뷰에 구체적인 경험 표현이 있지만 일부 광고성으로 보일 수 있는 문구도 포함되어 있습니다."
        if has_specific:
            return "리뷰에 상담, 비용, 대기 등 비교에 참고할 만한 구체적인 표현이 포함되어 있습니다."
        return "리뷰의 구체적인 경험 정보가 제한적이어서 추가 확인이 필요할 수 있습니다."

    @staticmethod
    def _recommendation(language: str) -> str:
        if language == "en":
            return "Use this as reference information and check recent reviews plus basic clinic details together."
        return "이 결과는 참고 정보로 활용하고, 병원 선택 전 최신 리뷰와 기본 정보를 함께 확인하는 것이 좋습니다."

    @staticmethod
    def _visit_tip(language: str) -> str:
        if language == "en":
            return "Before visiting, confirm treatment items, costs, and booking requirements with the clinic."
        return "방문 전 진료 항목, 비용 안내, 예약 필요 여부를 병원에 확인해 보세요."

    @staticmethod
    def _warnings(has_promotional: bool, has_repetition: bool, language: str) -> list[str]:
        warnings = []
        if has_promotional:
            warnings.append(
                "광고성 표현으로 보일 수 있는 문구가 일부 포함되어 있습니다."
                if language == "ko"
                else "Some wording may look promotional."
            )
        if has_repetition:
            warnings.append(
                "반복적으로 보이는 표현이 있어 추가 확인이 필요합니다."
                if language == "ko"
                else "Some repeated wording appears and may need additional checking."
            )
        return warnings

    @staticmethod
    def _positive_signals(has_specific: bool, language: str) -> list[str]:
        if has_specific:
            return [
                "실제 방문 경험을 보여주는 표현이 비교적 구체적입니다."
                if language == "ko"
                else "Some wording gives relatively concrete visit details."
            ]
        return []
