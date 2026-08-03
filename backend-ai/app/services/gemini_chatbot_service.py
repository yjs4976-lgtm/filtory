import json
import logging
import time
from typing import Any

from app.core.config import Settings
from app.prompts.chatbot_prompt import CHATBOT_SYSTEM_PROMPT
from app.schemas.chatbot_schema import ChatbotMessageRequest, ChatbotMessageResponse

logger = logging.getLogger(__name__)


class GeminiChatbotService:
    """Gemini 챗봇 호출과 제한된 재시도 정책을 담당한다.

    대화 문맥은 길이와 개수를 제한해 전달하고, 재시도 가능한 일시 오류만 지수형
    backoff로 처리한다. 최종 fallback 답변 결정은 backend-main에 남겨 둔다.
    """

    MAX_CONTEXT_MESSAGES = 6
    MAX_CONTEXT_MESSAGE_LENGTH = 240

    # 로그인 사용자의 LLM 챗봇 답변을 생성하는 서비스다.
    # backend-main이 내부 토큰으로 호출하며, 실패 시 backend-main 로컬 챗봇 fallback이 사용될 수 있다.
    @classmethod
    def answer(cls, payload: ChatbotMessageRequest, settings: Settings) -> ChatbotMessageResponse:
        # 챗봇은 비용이 발생하는 LLM 기능이므로 명시적으로 활성화된 경우에만 실행한다.
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
        # 낮은 temperature와 출력 상한은 안내 답변의 일관성과 비용을 함께 제한한다.
        # timeout 단위는 SDK 계약상 millisecond이므로 설정 초 값을 변환한다.
        config = types.GenerateContentConfig(
            http_options=types.HttpOptions(timeout=cls._timeout_milliseconds(settings)),
            system_instruction=CHATBOT_SYSTEM_PROMPT,
            temperature=0.35,
            max_output_tokens=settings.gemini_chatbot_max_output_tokens,
        )

        last_error = None
        for model in cls._candidate_models(settings):
            # 기본 모델 실패 시 fallback 모델까지 순서대로 시도한다.
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

    @classmethod
    def _build_user_content(cls, payload: ChatbotMessageRequest) -> str:
        # LLM에는 사용자의 질문, 선택된 분석 컨텍스트, 짧게 제한한 최근 대화만 JSON으로 전달한다.
        # 영어 모드에서는 한글 문맥을 그대로 복사하지 말라는 지시를 함께 보낸다.
        data: dict[str, Any] = {
            "language": payload.language,
            "answerLanguageInstruction": (
                "Answer only in English. Translate or omit Korean context snippets; do not copy Korean phrases."
                if payload.language == "en"
                else "한국어로만 답변하세요. 영어 문맥 조각은 의미만 한국어로 풀거나 생략하고 영어 문구를 그대로 섞지 마세요."
            ),
            "userMessage": payload.message,
            "analysisContext": payload.analysisContext or {},
            "conversationContext": cls._safe_conversation_context(payload.conversationContext),
        }
        return json.dumps(data, ensure_ascii=False)

    @classmethod
    def _safe_conversation_context(cls, context: dict[str, Any] | None) -> dict[str, Any]:
        if not isinstance(context, dict):
            return {}

        raw_messages = context.get("recentMessages")
        if not isinstance(raw_messages, list):
            return {}

        recent_messages = []
        for item in raw_messages[-cls.MAX_CONTEXT_MESSAGES:]:
            if not isinstance(item, dict):
                continue
            role = item.get("role")
            if role not in {"user", "assistant"}:
                continue
            content = cls._truncate(str(item.get("content") or "").strip(), cls.MAX_CONTEXT_MESSAGE_LENGTH)
            if not content:
                continue
            recent_messages.append({"role": role, "content": content})

        if not recent_messages:
            return {}

        return {
            "strategy": "recent_messages_only",
            "maxMessages": cls.MAX_CONTEXT_MESSAGES,
            "recentMessages": recent_messages,
        }

    @staticmethod
    def _truncate(value: str, limit: int) -> str:
        return value if len(value) <= limit else f"{value[:limit - 1]}…"

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
        # SDK 예외 타입이 버전별로 달라질 수 있어 status_code/code와 문자열 marker를 함께 확인한다.
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
