import logging

from app.core.config import get_settings
from app.schemas.review_analysis_schema import ReviewAnalyzeRequest, ReviewAnalyzeResponse
from app.services.mock_review_analysis_service import MockReviewAnalysisService

logger = logging.getLogger(__name__)


class ReviewAnalysisService:
    """실제 AI 분석과 결정론적 fallback 사이의 안정적인 진입점이다.

    외부 모델 사용은 설정으로 명시적으로 활성화된 경우에만 허용한다. 어느 경로를
    사용해도 동일한 ReviewAnalyzeResponse 계약을 반환해 호출부를 단순하게 유지한다.
    """

    @classmethod
    def analyze(cls, payload: ReviewAnalyzeRequest) -> ReviewAnalyzeResponse:
        settings = get_settings()

        # 운영에서는 설정값으로 OpenAI 분석을 켜고, 실패하면 같은 schema의 mock 분석으로 fallback한다.
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
        # 테스트와 수동 점검에서 OpenAI 없이도 동일 응답 계약을 확인하기 위한 진입점이다.
        return MockReviewAnalysisService.analyze(payload)
