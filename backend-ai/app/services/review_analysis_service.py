import logging

from app.core.config import get_settings
from app.schemas.review_analysis_schema import ReviewAnalyzeRequest, ReviewAnalyzeResponse
from app.services.mock_review_analysis_service import MockReviewAnalysisService

logger = logging.getLogger(__name__)


class ReviewAnalysisService:
    @classmethod
    def analyze(cls, payload: ReviewAnalyzeRequest) -> ReviewAnalyzeResponse:
        settings = get_settings()

        if settings.use_openai_review_analyzer:
            if settings.openai_api_key and settings.openai_review_model:
                try:
                    from app.services.openai_review_analysis_service import OpenAIReviewAnalysisService

                    return OpenAIReviewAnalysisService.analyze(payload, settings)
                except Exception as exc:
                    logger.warning(
                        "OpenAI review analysis failed; falling back to mock analyzer (%s)",
                        exc.__class__.__name__,
                    )
            else:
                logger.warning(
                    "USE_OPENAI_REVIEW_ANALYZER is true, but OpenAI review settings are incomplete. "
                    "Using mock analyzer."
                )

        return MockReviewAnalysisService.analyze(payload)

    @classmethod
    def analyze_mock(cls, payload: ReviewAnalyzeRequest) -> ReviewAnalyzeResponse:
        return MockReviewAnalysisService.analyze(payload)
