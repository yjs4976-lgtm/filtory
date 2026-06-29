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
TrustLevelKey = Literal["veryHigh", "high", "caution", "concern", "veryConcern"]
SuspicionLevelKey = Literal["low", "medium", "high"]


class ReviewAnalyzeRequest(BaseModel):
    category: HospitalCategory = Field(..., description="derma, eye, dental 또는 DB용 category")
    reviewText: str | None = Field(None, min_length=1, description="직접 입력한 리뷰 텍스트")
    reviews: list[str] = Field(default_factory=list, description="여러 리뷰를 한 번에 분석할 때 사용")
    hospitalName: str | None = Field(None, description="선택 사항")
    outputLanguage: OutputLanguage = "ko"

    @model_validator(mode="after")
    def require_review_text(self):
        has_review_text = bool(self.reviewText and self.reviewText.strip())
        has_reviews = any(review.strip() for review in self.reviews)

        if not has_review_text and not has_reviews:
            raise ValueError("reviewText or reviews is required")

        return self


class ReviewAnalyzeResponse(BaseModel):
    trustScore: int = Field(..., ge=0, le=100)
    trustGrade: str
    trustLevelKey: TrustLevelKey
    adSuspicion: str
    adSuspicionLevel: SuspicionLevelKey
    detectedPatterns: list[str]
    suspiciousPhrases: list[str]
    repetitivePhrases: list[str]
    informationLevel: str
    summary: str
    recommendation: str
    modelVersion: str
