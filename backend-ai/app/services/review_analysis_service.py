import re
from collections import Counter

from app.schemas.review_analysis_schema import ReviewAnalyzeRequest, ReviewAnalyzeResponse


class ReviewAnalysisService:
    MODEL_VERSION = "mock-review-analyzer-v1"

    CATEGORY_MAP = {
        "derma": "dermatology",
        "eye": "ophthalmology",
        "dental": "dentistry",
        "dermatology": "dermatology",
        "ophthalmology": "ophthalmology",
        "dentistry": "dentistry",
    }

    PROMOTIONAL_KEYWORDS = [
        "광고",
        "협찬",
        "체험단",
        "이벤트",
        "할인",
        "무료",
        "추천받고",
        "당일",
        "강추",
        "무조건",
        "최고",
        "대박",
        "완전",
    ]

    CONCRETE_KEYWORDS = [
        "진료",
        "검사",
        "상담",
        "설명",
        "치료",
        "시술",
        "비용",
        "가격",
        "대기",
        "예약",
        "통증",
        "주의사항",
        "경과",
        "처방",
    ]

    @classmethod
    def analyze(cls, payload: ReviewAnalyzeRequest) -> ReviewAnalyzeResponse:
        review_text = cls._merge_review_text(payload)
        promotional_phrases = cls._find_keywords(review_text, cls.PROMOTIONAL_KEYWORDS)
        concrete_phrases = cls._find_keywords(review_text, cls.CONCRETE_KEYWORDS)
        repetitive_phrases = cls._find_repetitive_phrases(review_text)

        score = cls._calculate_trust_score(
            review_text=review_text,
            promotional_count=len(promotional_phrases),
            concrete_count=len(concrete_phrases),
            repetitive_count=len(repetitive_phrases),
        )
        trust_grade, trust_level_key = cls._trust_grade(score)
        ad_suspicion, ad_suspicion_level = cls._ad_suspicion(
            len(promotional_phrases),
            len(repetitive_phrases),
        )
        information_level = cls._information_level(len(concrete_phrases), len(review_text))
        detected_patterns = cls._detected_patterns(
            promotional_phrases=promotional_phrases,
            repetitive_phrases=repetitive_phrases,
            concrete_count=len(concrete_phrases),
            review_length=len(review_text),
        )

        return ReviewAnalyzeResponse(
            trustScore=score,
            trustGrade=trust_grade,
            trustLevelKey=trust_level_key,
            adSuspicion=ad_suspicion,
            adSuspicionLevel=ad_suspicion_level,
            detectedPatterns=detected_patterns,
            suspiciousPhrases=promotional_phrases[:5],
            repetitivePhrases=repetitive_phrases[:5],
            informationLevel=information_level,
            summary=cls._summary(score, ad_suspicion, information_level, detected_patterns),
            recommendation=cls._recommendation(score, ad_suspicion_level, information_level),
            modelVersion=cls.MODEL_VERSION,
        )

    @staticmethod
    def _merge_review_text(payload: ReviewAnalyzeRequest) -> str:
        pieces = []
        if payload.reviewText:
            pieces.append(payload.reviewText)
        pieces.extend(review for review in payload.reviews if review.strip())
        return " ".join(piece.strip() for piece in pieces)

    @staticmethod
    def _find_keywords(text: str, keywords: list[str]) -> list[str]:
        return [keyword for keyword in keywords if keyword in text]

    @staticmethod
    def _find_repetitive_phrases(text: str) -> list[str]:
        words = re.findall(r"[가-힣A-Za-z0-9]{2,}", text.lower())
        counts = Counter(words)
        repeated = [
            word
            for word, count in counts.items()
            if count >= 3 and word not in {"그리고", "그래서", "정말"}
        ]
        return repeated

    @staticmethod
    def _calculate_trust_score(
        review_text: str,
        promotional_count: int,
        concrete_count: int,
        repetitive_count: int,
    ) -> int:
        score = 70
        score += min(concrete_count * 4, 20)
        score -= promotional_count * 6
        score -= repetitive_count * 4

        if len(review_text) < 60:
            score -= 12
        elif len(review_text) >= 180:
            score += 5

        return max(0, min(100, score))

    @staticmethod
    def _trust_grade(score: int) -> tuple[str, str]:
        if score >= 90:
            return "매우 신뢰", "veryHigh"
        if score >= 70:
            return "양호", "high"
        if score >= 50:
            return "주의", "caution"
        if score >= 30:
            return "의심", "concern"
        return "매우 의심", "veryConcern"

    @staticmethod
    def _ad_suspicion(promotional_count: int, repetitive_count: int) -> tuple[str, str]:
        risk = promotional_count + repetitive_count
        if risk >= 5:
            return "높음", "high"
        if risk >= 2:
            return "보통", "medium"
        return "낮음", "low"

    @staticmethod
    def _information_level(concrete_count: int, review_length: int) -> str:
        if concrete_count >= 5 and review_length >= 120:
            return "구체적"
        if concrete_count >= 2:
            return "보통"
        return "정보 부족"

    @staticmethod
    def _detected_patterns(
        promotional_phrases: list[str],
        repetitive_phrases: list[str],
        concrete_count: int,
        review_length: int,
    ) -> list[str]:
        patterns = []

        if promotional_phrases:
            patterns.append("광고성 의심 표현 포함")
        if repetitive_phrases:
            patterns.append("반복적이거나 과장된 표현")
        if concrete_count < 2:
            patterns.append("구체적인 진료 과정 부족")
        if review_length < 60:
            patterns.append("리뷰 길이가 짧아 판단 정보 부족")

        return patterns or ["특별히 강한 의심 패턴 없음"]

    @staticmethod
    def _summary(
        score: int,
        ad_suspicion: str,
        information_level: str,
        detected_patterns: list[str],
    ) -> str:
        patterns = ", ".join(detected_patterns)
        return (
            f"리뷰 신뢰도는 {score}점이며 광고 의심도는 {ad_suspicion}입니다. "
            f"정보 구체성은 {information_level} 수준이고, 주요 판단 근거는 {patterns}입니다."
        )

    @staticmethod
    def _recommendation(score: int, ad_suspicion_level: str, information_level: str) -> str:
        if score >= 80 and ad_suspicion_level == "low":
            return "대체로 참고할 수 있지만, 방문 전 최신 리뷰와 병원 기본 정보를 함께 확인하세요."
        if ad_suspicion_level == "high" or information_level == "정보 부족":
            return "이 리뷰 하나만 믿기보다는 다른 리뷰, 병원 위치, 진료 항목, 가격 정보를 함께 확인하는 것이 좋습니다."
        return "일부 광고성 또는 정보 부족 가능성이 있으니 여러 리뷰를 비교해서 판단하는 것이 좋습니다."
