import os
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv

# backend-ai 실행 시 프로젝트 루트의 환경 설정을 한 번 로드한다.
# 테스트/검증에서 env 파일 접근을 피해야 할 때는 FILTORY_SKIP_DOTENV=1로 끌 수 있다.
if os.getenv("FILTORY_SKIP_DOTENV") != "1":
    load_dotenv(Path(__file__).resolve().parents[2] / ".env")

OPENAI_REVIEW_MODEL_DEFAULT = "gpt-4o-mini"


def _is_enabled(value: str | None) -> bool:
    return str(value or "").strip().lower() in {"1", "true", "yes", "on"}


def _float_or_default(value: str | None, default: float) -> float:
    try:
        return float(value) if value else default
    except (TypeError, ValueError):
        return default


def _int_or_default(value: str | None, default: int) -> int:
    try:
        return int(value) if value else default
    except (TypeError, ValueError):
        return default


class Settings:
    def __init__(self):
        # 리뷰 분석은 USE_OPENAI_REVIEW_ANALYZER와 OPENAI_API_KEY가 모두 준비됐을 때만 OpenAI를 사용한다.
        # 설정이 부족하면 서비스 계층에서 Mock fallback으로 같은 응답 계약을 유지한다.
        self.use_openai_review_analyzer = _is_enabled(os.getenv("USE_OPENAI_REVIEW_ANALYZER"))
        self.openai_api_key = (os.getenv("OPENAI_API_KEY") or "").strip() or None
        self.openai_review_model = (os.getenv("OPENAI_REVIEW_MODEL") or "").strip() or OPENAI_REVIEW_MODEL_DEFAULT
        self.openai_timeout_seconds = _float_or_default(os.getenv("OPENAI_TIMEOUT_SECONDS"), 20)
        self.enable_gemini_chatbot = _is_enabled(os.getenv("ENABLE_GEMINI_CHATBOT"))
        self.gemini_api_key = os.getenv("GEMINI_API_KEY")
        self.gemini_model = os.getenv("GEMINI_MODEL") or "gemini-2.5-flash"
        self.gemini_fallback_model = os.getenv("GEMINI_FALLBACK_MODEL") or "gemini-2.5-flash-lite"
        self.gemini_timeout_seconds = _float_or_default(os.getenv("GEMINI_TIMEOUT_SECONDS"), 10)
        self.gemini_max_retries = max(0, _int_or_default(os.getenv("GEMINI_MAX_RETRIES"), 0))
        self.gemini_chatbot_max_output_tokens = min(
            1000,
            max(256, _int_or_default(os.getenv("GEMINI_CHATBOT_MAX_OUTPUT_TOKENS"), 700)),
        )
        self.ai_internal_token = os.getenv("AI_INTERNAL_TOKEN")


@lru_cache
def get_settings() -> Settings:
    # lru_cache는 인자가 없는 함수 결과를 한 번만 만들고 재사용하게 해주는 표준 라이브러리 데코레이터다.
    # 요청마다 환경 변수를 다시 파싱하지 않도록 프로세스 단위로 Settings를 캐싱한다.
    return Settings()
