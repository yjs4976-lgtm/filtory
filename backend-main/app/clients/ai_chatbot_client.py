import json
import logging
import os
import urllib.error
import urllib.request

from flask import current_app, has_app_context

logger = logging.getLogger(__name__)


class AIChatbotClient:
    DEFAULT_URL = "http://127.0.0.1:8000/api/chatbot/message"
    DEFAULT_TIMEOUT_SECONDS = 12

    @classmethod
    def answer(cls, message, language="ko", analysis_context=None):
        url = cls._api_url()
        if not url:
            return None

        payload = {
            "message": message,
            "language": language,
            "analysisContext": analysis_context or {},
        }
        internal_token = cls._internal_token()
        if not internal_token:
            logger.warning("Remote AI chatbot is enabled but AI_INTERNAL_TOKEN is not configured; using local fallback")
            return None

        # 브라우저가 backend-ai를 직접 호출하지 못하게 하고, backend-main만 내부 토큰으로 접근한다.
        headers = {
            "Content-Type": "application/json",
            "X-Internal-Token": internal_token,
        }

        # Request 객체에 JSON byte body를 넣어 backend-ai FastAPI endpoint로 POST 요청을 만든다.
        request = urllib.request.Request(
            url,
            data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
            headers=headers,
            method="POST",
        )

        try:
            # response.read()는 bytes를 반환하므로 UTF-8로 decode한 뒤 JSON 객체로 파싱한다.
            with urllib.request.urlopen(request, timeout=cls._timeout_seconds()) as response:
                body = json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            logger.warning(
                "AI chatbot request failed; using local fallback: status=%s body=%s",
                exc.code,
                cls._read_error_body(exc),
            )
            return None
        except (urllib.error.URLError, TimeoutError, ValueError) as exc:
            logger.warning("AI chatbot request failed; using local fallback: %s", exc)
            return None

        answer = str(body.get("answer") or "").strip()
        if not answer:
            return None

        return {
            "answer": answer,
            "source": body.get("source") or "llm",
            "modelVersion": body.get("modelVersion"),
        }

    @classmethod
    def _api_url(cls):
        if not cls._is_enabled(_config_value("ENABLE_REMOTE_CHATBOT") or os.getenv("ENABLE_REMOTE_CHATBOT")):
            return None

        explicit_url = str(_config_value("AI_CHATBOT_API_URL") or os.getenv("AI_CHATBOT_API_URL") or "").strip()
        return explicit_url or cls.DEFAULT_URL

    @classmethod
    def _timeout_seconds(cls):
        try:
            return float(
                _config_value("AI_CHATBOT_TIMEOUT_SECONDS")
                or os.getenv("AI_CHATBOT_TIMEOUT_SECONDS")
                or cls.DEFAULT_TIMEOUT_SECONDS
            )
        except (TypeError, ValueError):
            return cls.DEFAULT_TIMEOUT_SECONDS

    @classmethod
    def _internal_token(cls):
        return str(_config_value("AI_INTERNAL_TOKEN") or os.getenv("AI_INTERNAL_TOKEN") or "").strip()

    @staticmethod
    def _is_enabled(value):
        return str(value or "").strip().lower() in {"1", "true", "yes", "on"}

    @staticmethod
    def _read_error_body(exc):
        try:
            return exc.read().decode("utf-8")[:500]
        except Exception:
            return ""


def _config_value(key):
    if not has_app_context():
        return None
    return current_app.config.get(key)
