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


class Settings:
    def __init__(self):
        self.use_openai_review_analyzer = _is_enabled(os.getenv("USE_OPENAI_REVIEW_ANALYZER"))
        self.openai_api_key = os.getenv("OPENAI_API_KEY")
        self.openai_review_model = os.getenv("OPENAI_REVIEW_MODEL") or "gpt-5.4-nano"
        self.openai_timeout_seconds = _float_or_default(os.getenv("OPENAI_TIMEOUT_SECONDS"), 20)


@lru_cache
def get_settings() -> Settings:
    return Settings()
