import os
from functools import lru_cache

from dotenv import load_dotenv

load_dotenv()


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
        self.use_openai_review_analyzer = _is_enabled(os.getenv("USE_OPENAI_REVIEW_ANALYZER"))
        self.openai_api_key = os.getenv("OPENAI_API_KEY")
        self.openai_review_model = os.getenv("OPENAI_REVIEW_MODEL") or "gpt-5.4-nano"
        self.openai_timeout_seconds = _float_or_default(os.getenv("OPENAI_TIMEOUT_SECONDS"), 20)
        self.enable_gemini_chatbot = _is_enabled(os.getenv("ENABLE_GEMINI_CHATBOT"))
        self.gemini_api_key = os.getenv("GEMINI_API_KEY")
        self.gemini_model = os.getenv("GEMINI_MODEL") or "gemini-2.5-flash"
        self.gemini_fallback_model = os.getenv("GEMINI_FALLBACK_MODEL") or "gemini-2.5-flash-lite"
        self.gemini_timeout_seconds = _float_or_default(os.getenv("GEMINI_TIMEOUT_SECONDS"), 10)
        self.gemini_max_retries = max(0, _int_or_default(os.getenv("GEMINI_MAX_RETRIES"), 0))
        self.ai_internal_token = os.getenv("AI_INTERNAL_TOKEN")


@lru_cache
def get_settings() -> Settings:
    return Settings()
