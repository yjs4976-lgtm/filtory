from typing import Literal

from pydantic import BaseModel, Field, model_validator

HospitalCategory = Literal[
    "derma",
    "eye",
    "dental",
    "dermatology",
    "ophthalmology",
    "dentistry",
]

OutputLanguage = Literal["ko", "en"]
ReviewBurstStatus = Literal["available", "unavailable"]
ConvenienceCheckStatus = Literal["confirmed", "notConfirmed", "unknown"]
TrustLevelKey = Literal[
    "very_safe",
    "safe",
    "normal",
    "caution",
    "danger",
    "very_high",
    "high",
    "medium",
    "low",
    "very_low",
]
SuspicionLevelKey = Literal["낮음", "보통", "높음", "low", "medium", "high"]
MockLevelKey = Literal["low", "medium", "high"]
InformationLevel = Literal[
    "부족",
    "충분",
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
]


class ReviewAnalyzeRequest(BaseModel):
    category: HospitalCategory = Field(..., description="derma, eye, dental 또는 DB용 category")
    reviewText: str | None = Field(None, min_length=1, description="직접 입력한 리뷰 텍스트")
    reviews: list[str] = Field(default_factory=list, description="여러 리뷰를 한 번에 분석할 때 사용")
    reviewDates: list[str] = Field(default_factory=list, description="reviews와 같은 순서의 리뷰 작성일")
    hospitalName: str | None = Field(None, description="선택 사항")
    outputLanguage: OutputLanguage = "ko"
    address: str | None = Field(None, description="병원 주소")
    roadAddress: str | None = Field(None, description="병원 도로명 주소")
    phone: str | None = Field(None, description="병원 전화번호")
    treatmentItems: list[str] = Field(default_factory=list, description="진료 항목")
    description: str | None = Field(None, description="병원 소개")
    hasPhotos: bool | None = Field(None, description="사진 정보 보유 여부")
    homepageUrl: str | None = Field(None, description="병원 홈페이지 또는 예약 URL")
    kakaoPlaceUrl: str | None = Field(None, description="카카오맵 장소 URL")
    sourceProvider: str | None = Field(None, description="공개 장소 정보 제공자")
    externalPlaceId: str | None = Field(None, description="외부 장소 ID")
    latitude: float | None = Field(None, description="위도")
    longitude: float | None = Field(None, description="경도")
    naverPlaceUrl: str | None = Field(None, description="네이버 플레이스 URL")
    naverPlaceId: str | None = Field(None, description="네이버 플레이스 ID")
    googleMapUrl: str | None = Field(None, description="구글 지도 URL")
    googleRegistered: bool | None = Field(None, description="구글 지도 등록 여부")
    googlePlaceId: str | None = Field(None, description="구글 플레이스 ID")
    englishName: str | None = Field(None, description="영문 병원명")
    hasEnglishInfo: bool | None = Field(None, description="영문 안내 정보 보유 여부")
    hasEnglishReviews: bool | None = Field(None, description="영문 리뷰 보유 여부")
    englishReviews: bool | None = Field(None, description="영문 리뷰 보유 여부")
    hasGooglePhotos: bool | None = Field(None, description="구글 사진 정보 보유 여부")

    @model_validator(mode="after")
    def require_review_text(self):
        if self.hasEnglishReviews is None and self.englishReviews is not None:
            self.hasEnglishReviews = self.englishReviews
        if self.englishReviews is None and self.hasEnglishReviews is not None:
            self.englishReviews = self.hasEnglishReviews

        has_review_text = bool(self.reviewText and self.reviewText.strip())
        has_reviews = any(review.strip() for review in self.reviews)

        if not has_review_text and not has_reviews:
            raise ValueError("reviewText or reviews is required")

        return self


class ReviewOcrImage(BaseModel):
    filename: str | None = Field(None, max_length=255)
    mimeType: Literal["image/png", "image/jpeg", "image/webp"]
    dataBase64: str = Field(..., min_length=1)


class ReviewOcrRequest(BaseModel):
    images: list[ReviewOcrImage] = Field(..., min_length=1, max_length=5)
    language: OutputLanguage = "ko"


class ReviewOcrResponse(BaseModel):
    text: str = ""
    reviews: list[str] = Field(default_factory=list)
    source: Literal["llm"] = "llm"
    modelVersion: str


class ReviewEvidence(BaseModel):
    suspiciousPhrases: list[str] = Field(default_factory=list)
    specificPhrases: list[str] = Field(default_factory=list)
    repetitivePhrases: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    positiveSignals: list[str] = Field(default_factory=list)
    checkItems: list[str] = Field(default_factory=list)


class ReviewAnalyzeResponse(BaseModel):
    totalScore: int = Field(..., ge=0, le=100)
    trustScore: int = Field(..., ge=0, le=100)
    reviewTrustScore: int = Field(..., ge=0, le=100)
    evidenceScore: int = Field(..., ge=0, le=100)
    riskScore: int = Field(..., ge=0, le=100)
    specificityScore: int = Field(..., ge=0, le=100)
    balanceScore: int = Field(..., ge=0, le=100)
    diversityScore: int = Field(..., ge=0, le=100)
    informativeScore: int = Field(..., ge=0, le=100)
    naturalnessScore: int = Field(..., ge=0, le=100)
    promoSignalScore: int = Field(..., ge=0, le=100)
    repetitionScore: int = Field(..., ge=0, le=100)
    exaggerationScore: int = Field(..., ge=0, le=100)
    eventDiscountScore: int = Field(..., ge=0, le=100)
    reviewBurstScore: int | None = Field(None, ge=0, le=100)
    reviewBurstStatus: ReviewBurstStatus = "unavailable"
    analysisConfidence: MockLevelKey = "medium"
    analysisConfidenceDescription: str = ""
    scoreBreakdown: dict[str, int | str | bool | None] = Field(default_factory=dict)
    adScore: int = Field(..., ge=0, le=100)
    adSuspicionScore: int | None = Field(None, ge=0, le=100)
    placeScore: int = Field(..., ge=0, le=100)
    foreignerScore: int = Field(..., ge=0, le=100)
    informationScore: int | None = Field(None, ge=0, le=100)
    reviewInformationScore: int | None = Field(None, ge=0, le=100)
    reviewInformationLevel: InformationLevel | None = None
    grade: str | None = Field(None, description="Mock API compatibility grade such as A, B, C")
    trustGrade: str
    trustLevelKey: TrustLevelKey
    adSuspicion: str
    adSuspicionLevel: SuspicionLevelKey
    repetitionLevel: MockLevelKey = Field(..., description="Repeated phrase level")
    informationCompleteness: MockLevelKey | None = Field(None, description="Mock API compatibility information completeness")
    positiveSignals: list[str] = Field(default_factory=list)
    negativeSignals: list[str] = Field(default_factory=list)
    warningSignals: list[str] = Field(default_factory=list)
    globalAccessibilityScore: int | None = Field(None, ge=0, le=100)
    globalAccessibilityLevel: SuspicionLevelKey | None = None
    globalAccessibilityMaxScore: int | None = Field(None, ge=1, le=100)
    globalAccessibilityChecks: dict[str, ConvenienceCheckStatus | bool] = Field(default_factory=dict)
    detectedPatterns: list[str]
    suspiciousPhrases: list[str]
    repetitivePhrases: list[str]
    informationLevel: InformationLevel
    summary: str
    recommendation: str
    visitTip: str = ""
    evidence: ReviewEvidence
    analyzedReviewCount: int = Field(..., ge=0)
    modelVersion: str
