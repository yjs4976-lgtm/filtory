import json
import logging
import os
import urllib.error
import urllib.request

logger = logging.getLogger(__name__)


class AIChatbotClient:
    DEFAULT_URL = "http://127.0.0.1:8000/api/chatbot/message"
    DEFAULT_TIMEOUT_SECONDS = 8

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
        request = urllib.request.Request(
            url,
            data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )

        try:
            with urllib.request.urlopen(request, timeout=cls._timeout_seconds()) as response:
                body = json.loads(response.read().decode("utf-8"))
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
        if not cls._is_enabled(os.getenv("ENABLE_REMOTE_CHATBOT")):
            return None

        explicit_url = str(os.getenv("AI_CHATBOT_API_URL") or "").strip()
        return explicit_url or cls.DEFAULT_URL

    @classmethod
    def _timeout_seconds(cls):
        try:
            return float(os.getenv("AI_CHATBOT_TIMEOUT_SECONDS") or cls.DEFAULT_TIMEOUT_SECONDS)
        except (TypeError, ValueError):
            return cls.DEFAULT_TIMEOUT_SECONDS

    @staticmethod
    def _is_enabled(value):
        return str(value or "").strip().lower() in {"1", "true", "yes", "on"}
