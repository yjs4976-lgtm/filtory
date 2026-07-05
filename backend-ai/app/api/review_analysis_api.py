import logging
import secrets

from fastapi import APIRouter, Header, HTTPException

from app.core.config import get_settings
from app.schemas.review_analysis_schema import ReviewAnalyzeRequest, ReviewAnalyzeResponse, ReviewOcrRequest, ReviewOcrResponse
from app.services.review_analysis_service import ReviewAnalysisService
from app.services.review_ocr_service import ReviewOcrService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/reviews", tags=["review-analysis"])


@router.post("/analyze", response_model=ReviewAnalyzeResponse)
def analyze_review(
    payload: ReviewAnalyzeRequest,
    x_internal_token: str | None = Header(default=None, alias="X-Internal-Token"),
):
    settings = get_settings()
    _verify_internal_token_if_configured(settings.ai_internal_token, x_internal_token)
    return ReviewAnalysisService.analyze(payload)


@router.post("/ocr", response_model=ReviewOcrResponse)
def extract_review_text(
    payload: ReviewOcrRequest,
    x_internal_token: str | None = Header(default=None, alias="X-Internal-Token"),
):
    settings = get_settings()
    _verify_internal_token(settings.ai_internal_token, x_internal_token)

    try:
        return ReviewOcrService.extract(payload, settings)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        logger.warning("Review OCR is unavailable: %s", exc)
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        logger.warning("Review OCR request failed: %s", exc)
        raise HTTPException(status_code=502, detail="Review OCR request failed") from exc


def _verify_internal_token(expected_token: str | None, received_token: str | None):
    if not expected_token:
        raise HTTPException(status_code=503, detail="Internal token is not configured")
    if not received_token or not secrets.compare_digest(expected_token, received_token):
        raise HTTPException(status_code=401, detail="Invalid internal token")


def _verify_internal_token_if_configured(expected_token: str | None, received_token: str | None):
    if not expected_token:
        return
    if not received_token or not secrets.compare_digest(expected_token, received_token):
        raise HTTPException(status_code=401, detail="Invalid internal token")
