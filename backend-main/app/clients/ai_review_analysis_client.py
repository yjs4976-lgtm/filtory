import json
import logging
import os
import urllib.error
import urllib.request

from flask import current_app, has_app_context

logger = logging.getLogger(__name__)


class AIReviewAnalysisClient:
    """backend-ai 리뷰 분석 API와 통신하는 내부 HTTP 어댑터다.

    호출 시간 제한과 내부 인증 헤더를 이 경계에서 통일한다. 응답 schema가 예상과
    다르면 성공으로 간주하지 않아 불완전한 분석 결과가 DB에 저장되는 것을 막는다.
    """

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

        request = urllib.request.Request(
            url,
            data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
            headers=headers,
            method="POST",
        )

        try:
            # backend-ai가 모델 timeout 뒤 안전 fallback을 만들 시간까지 포함한
            # timeout을 사용한다. 너무 짧게 줄이면 정상 fallback도 502로 오인된다.
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
        # 앱 컨텍스트 밖에서 실행되는 단위 테스트도 같은 client를 사용할 수 있도록
        # Flask config를 우선하고 프로세스 환경값을 보조 경로로 둔다.
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
