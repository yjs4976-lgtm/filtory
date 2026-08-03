import logging
import secrets

from fastapi import APIRouter, Header, HTTPException

from app.core.config import get_settings
from app.schemas.review_analysis_schema import ReviewAnalyzeRequest, ReviewAnalyzeResponse, ReviewOcrRequest, ReviewOcrResponse
from app.services.review_analysis_service import ReviewAnalysisService
from app.services.review_ocr_service import ReviewOcrService

logger = logging.getLogger(__name__)

# 리뷰 원문과 이미지가 들어오는 내부 endpoint를 한 prefix 아래에 격리한다.
router = APIRouter(prefix="/api/reviews", tags=["review-analysis"])


@router.post("/analyze", response_model=ReviewAnalyzeResponse)
def analyze_review(
    payload: ReviewAnalyzeRequest,
    x_internal_token: str | None = Header(default=None, alias="X-Internal-Token"),
):
    settings = get_settings()
    # 리뷰 분석 API는 backend-main에서 내부 토큰을 붙여 호출하는 서버 간 전용
    # endpoint다. 토큰 미설정 시 개발 fallback을 공개하지 않고 503으로 닫는다.
    _verify_internal_token(settings.ai_internal_token, x_internal_token)
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
    """backend-main과 공유한 내부 토큰을 timing-safe 비교로 검증한다."""
    expected = str(expected_token or "").strip()
    received = str(received_token or "").strip()

    if not expected:
        # 토큰이 설정되지 않은 배포는 외부 노출 위험이 있으므로 mock으로라도 처리하지 않는다.
        raise HTTPException(status_code=503, detail="AI service authentication is not configured")

    if not received or not secrets.compare_digest(expected, received):
        raise HTTPException(status_code=401, detail="Invalid internal token")
