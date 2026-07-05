import json
import logging
import os
import urllib.error
import urllib.request

from flask import current_app

logger = logging.getLogger(__name__)


class AIReviewAnalysisClient:
    REVIEW_ANALYSIS_PATH = "/api/reviews/analyze"

    @classmethod
    def analyze(cls, payload):
        url = cls._api_url()
        internal_token = str(os.getenv("AI_INTERNAL_TOKEN") or "").strip()
        if not internal_token:
            raise RuntimeError("AI_INTERNAL_TOKEN is not configured")

        headers = {
            "Content-Type": "application/json",
            "X-Internal-Token": internal_token,
        }

        request = urllib.request.Request(
            url,
            data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
            headers=headers,
            method="POST",
        )

        try:
            with urllib.request.urlopen(request, timeout=cls._timeout_seconds()) as response:
                body = json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            logger.warning(
                "Backend AI review analysis request failed: status=%s",
                exc.code,
            )
            raise RuntimeError("Backend AI review analysis failed") from exc
        except (urllib.error.URLError, TimeoutError, ValueError) as exc:
            logger.warning(
                "Backend AI review analysis request failed: %s",
                exc.__class__.__name__,
            )
            raise RuntimeError("Backend AI review analysis failed") from exc

        if not isinstance(body, dict):
            raise RuntimeError("Backend AI review analysis failed")

        return body

    @classmethod
    def _api_url(cls):
        base_url = str(current_app.config.get("BACKEND_AI_BASE_URL") or "http://127.0.0.1:8000").strip()
        return f"{base_url.rstrip('/')}{cls.REVIEW_ANALYSIS_PATH}"

    @classmethod
    def _timeout_seconds(cls):
        value = current_app.config.get("BACKEND_AI_TIMEOUT_SECONDS", 20)
        try:
            return float(value)
        except (TypeError, ValueError):
            return 20
