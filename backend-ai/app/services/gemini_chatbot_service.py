import json
import logging
import time
from typing import Any

from app.core.config import Settings
from app.prompts.chatbot_prompt import CHATBOT_SYSTEM_PROMPT
from app.schemas.chatbot_schema import ChatbotMessageRequest, ChatbotMessageResponse

logger = logging.getLogger(__name__)


class GeminiChatbotService:
    @classmethod
    def answer(cls, payload: ChatbotMessageRequest, settings: Settings) -> ChatbotMessageResponse:
        if not settings.enable_gemini_chatbot:
            raise RuntimeError("Gemini chatbot is disabled")
        if not settings.gemini_api_key:
            raise RuntimeError("GEMINI_API_KEY is not configured")

        try:
            from google import genai
            from google.genai import types
        except ImportError as exc:
            raise RuntimeError("google-genai package is not installed") from exc

        client = genai.Client(api_key=settings.gemini_api_key)
        contents = cls._build_user_content(payload)
        config = types.GenerateContentConfig(
            http_options=types.HttpOptions(timeout=cls._timeout_milliseconds(settings)),
            system_instruction=CHATBOT_SYSTEM_PROMPT,
            temperature=0.35,
            max_output_tokens=500,
        )

        last_error = None
        for model in cls._candidate_models(settings):
            for attempt in range(settings.gemini_max_retries + 1):
                try:
                    response = client.models.generate_content(
                        model=model,
                        contents=contents,
                        config=config,
                    )
                    answer = cls._extract_text(response)
                    return ChatbotMessageResponse(
                        answer=answer,
                        source="llm",
                        modelVersion=f"gemini:{model}",
                    )
                except Exception as exc:
                    last_error = exc
                    if not cls._is_retryable_error(exc):
                        logger.warning(
                            "Gemini chatbot request failed with non-retryable error; model=%s: %r",
                            model,
                            exc,
                        )
                        raise RuntimeError(cls._error_message("Gemini chatbot request failed", exc)) from exc
                    if attempt >= settings.gemini_max_retries:
                        logger.warning(
                            "Gemini chatbot request exhausted retries; model=%s: %r",
                            model,
                            exc,
                        )
                        break
                    delay_seconds = min(0.5 * (2 ** attempt), 2.0)
                    logger.warning(
                        "Gemini chatbot request failed with retryable error; retrying model=%s attempt=%s: %s",
                        model,
                        attempt + 1,
                        exc,
                    )
                    time.sleep(delay_seconds)

        raise RuntimeError(cls._error_message("Gemini chatbot is temporarily unavailable", last_error)) from last_error

    @staticmethod
    def _build_user_content(payload: ChatbotMessageRequest) -> str:
        data: dict[str, Any] = {
            "language": payload.language,
            "answerLanguageInstruction": (
                "Answer only in English. Translate or omit Korean context snippets; do not copy Korean phrases."
                if payload.language == "en"
                else "한국어로만 답변하세요. 영어 문맥 조각은 의미만 한국어로 풀거나 생략하고 영어 문구를 그대로 섞지 마세요."
            ),
            "userMessage": payload.message,
            "analysisContext": payload.analysisContext or {},
        }
        return json.dumps(data, ensure_ascii=False)

    @staticmethod
    def _candidate_models(settings: Settings) -> list[str]:
        models = [settings.gemini_model]
        fallback_model = str(settings.gemini_fallback_model or "").strip()
        if fallback_model and fallback_model not in models:
            models.append(fallback_model)
        return models

    @staticmethod
    def _timeout_milliseconds(settings: Settings) -> int:
        return max(10000, int(settings.gemini_timeout_seconds * 1000))

    @staticmethod
    def _is_retryable_error(exc: Exception) -> bool:
        error_text = f"{type(exc).__name__} {repr(exc)} {str(exc)}".lower()
        status_code = getattr(exc, "status_code", None) or getattr(exc, "code", None)
        if status_code in {429, 500, 502, 503, 504}:
            return True
        retryable_markers = [
            "429",
            "500",
            "502",
            "503",
            "504",
            "unavailable",
            "resource_exhausted",
            "deadline_exceeded",
            "high demand",
            "temporarily",
            "timeout",
        ]
        return any(marker in error_text for marker in retryable_markers)

    @staticmethod
    def _error_message(prefix: str, exc: Exception | None) -> str:
        if exc is None:
            return prefix
        return f"{prefix}: {type(exc).__name__}: {exc}"

    @staticmethod
    def _extract_text(response: Any) -> str:
        text = str(getattr(response, "text", "") or "").strip()
        if text:
            return text

        logger.debug("Gemini response did not include text: %s", response)
        raise ValueError("Gemini response did not include text")
