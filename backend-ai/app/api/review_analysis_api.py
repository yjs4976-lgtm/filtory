from fastapi import APIRouter

from app.schemas.review_analysis_schema import ReviewAnalyzeRequest, ReviewAnalyzeResponse
from app.services.review_analysis_service import ReviewAnalysisService

router = APIRouter(prefix="/api/reviews", tags=["review-analysis"])


@router.post("/analyze", response_model=ReviewAnalyzeResponse)
def analyze_review(payload: ReviewAnalyzeRequest):
    return ReviewAnalysisService.analyze(payload)
