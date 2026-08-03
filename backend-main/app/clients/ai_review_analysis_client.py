import json
import logging
import os
import urllib.error
import urllib.request

from flask import current_app, has_app_context

logger = logging.getLogger(__name__)


class AIReviewAnalysisClient:
    REVIEW_ANALYSIS_PATH = "/api/reviews/analyze"

    @classmethod
    def analyze(cls, payload):
        url = cls._api_url()
        internal_token = cls._internal_token()
        if not internal_token:
            raise RuntimeError("AI_INTERNAL_TOKEN is not configured")

        # 리뷰 원문은 backend-main을 거쳐 내부 토큰으로만 backend-ai에 전달한다.
        # 프론트가 AI 서버 주소나 토큰을 직접 알 필요가 없어야 한다.
        headers = {
            "Content-Type": "application/json",
            "X-Internal-Token": internal_token,
        }

        # urllib.request.Request는 표준 라이브러리만으로 HTTP method/header/body를 지정하는 객체다.
        request = urllib.request.Request(
            url,
            data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
            headers=headers,
            method="POST",
        )

        try:
            # urlopen()은 실제 HTTP 요청을 보내고 file-like response 객체를 돌려준다.
            with urllib.request.urlopen(request, timeout=cls._timeout_seconds()) as response:
                body = json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            error_body = _read_error_body(exc)
            logger.warning(
                "Backend AI review analysis request failed: status=%s body=%s",
                exc.code,
                error_body,
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
        # has_app_context()가 true면 Flask current_app.config를, 아니면 os.getenv를 사용해 테스트에서도 호출 가능하게 한다.
        base_url = str(_config_value("BACKEND_AI_BASE_URL") or os.getenv("BACKEND_AI_BASE_URL") or "http://127.0.0.1:8000").strip()
        return f"{base_url.rstrip('/')}{cls.REVIEW_ANALYSIS_PATH}"

    @classmethod
    def _timeout_seconds(cls):
        # backend-ai의 OpenAI 제한시간(기본 20초) 이후 생성되는 안전 fallback까지 받을 수 있어야 한다.
        value = _config_value("BACKEND_AI_TIMEOUT_SECONDS") or os.getenv("BACKEND_AI_TIMEOUT_SECONDS") or 30
        try:
            return float(value)
        except (TypeError, ValueError):
            return 30

    @classmethod
    def _internal_token(cls):
        return str(_config_value("AI_INTERNAL_TOKEN") or os.getenv("AI_INTERNAL_TOKEN") or "").strip()


def _config_value(key):
    if not has_app_context():
        return None
    return current_app.config.get(key)


def _read_error_body(exc):
    try:
        return exc.read().decode("utf-8")[:500]
    except Exception:
        return ""
