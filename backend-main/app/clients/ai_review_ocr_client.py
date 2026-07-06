import base64
import json
import logging
import os
import urllib.error
import urllib.request

from flask import current_app, has_app_context

logger = logging.getLogger(__name__)


class AIReviewOcrClient:
    REVIEW_OCR_PATH = "/api/reviews/ocr"
    ALLOWED_CONTENT_TYPES = {"image/png", "image/jpeg", "image/webp"}
    MAX_FILE_SIZE = 5 * 1024 * 1024
    MAX_FILE_COUNT = 5

    @classmethod
    def extract(cls, image_files, language="ko"):
        files = [file for file in image_files if file and file.filename]
        if not files:
            raise ValueError("image file is required")
        if len(files) > cls.MAX_FILE_COUNT:
            raise ValueError("Up to 5 image files can be uploaded")

        payload = {
            "language": "en" if language == "en" else "ko",
            "images": [cls._build_image_payload(file) for file in files],
        }
        internal_token = cls._internal_token()
        if not internal_token:
            raise RuntimeError("AI_INTERNAL_TOKEN is not configured")

        # OCR 이미지는 민감한 리뷰 캡처를 포함할 수 있으므로 내부 토큰이 없으면 backend-ai로 보내지 않는다.
        headers = {
            "Content-Type": "application/json",
            "X-Internal-Token": internal_token,
        }

        request = urllib.request.Request(
            cls._api_url(),
            data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
            headers=headers,
            method="POST",
        )

        try:
            with urllib.request.urlopen(request, timeout=cls._timeout_seconds()) as response:
                body = json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            logger.warning(
                "Backend AI review OCR request failed: status=%s body=%s",
                exc.code,
                cls._read_error_body(exc),
            )
            raise RuntimeError("Backend AI review OCR failed") from exc
        except (urllib.error.URLError, TimeoutError, ValueError) as exc:
            logger.warning("Backend AI review OCR request failed: %s", exc)
            raise RuntimeError("Backend AI review OCR failed") from exc

        if not isinstance(body, dict):
            raise RuntimeError("Backend AI review OCR failed")

        return {
            "text": str(body.get("text") or ""),
            "reviews": [review for review in body.get("reviews") or [] if isinstance(review, str)],
            "source": body.get("source") or "llm",
            "modelVersion": body.get("modelVersion"),
        }

    @classmethod
    def _build_image_payload(cls, image_file):
        mimetype = image_file.mimetype
        if mimetype not in cls.ALLOWED_CONTENT_TYPES:
            raise ValueError("Only PNG, JPEG, and WebP images are allowed")

        content = image_file.stream.read(cls.MAX_FILE_SIZE + 1)
        if not content:
            raise ValueError("image file is required")
        if len(content) > cls.MAX_FILE_SIZE:
            raise ValueError("Image file must be 5 MB or smaller")

        return {
            "filename": image_file.filename,
            "mimeType": mimetype,
            "dataBase64": base64.b64encode(content).decode("ascii"),
        }

    @classmethod
    def _api_url(cls):
        base_url = str(_config_value("BACKEND_AI_BASE_URL") or os.getenv("BACKEND_AI_BASE_URL") or "http://127.0.0.1:8000").strip()
        return f"{base_url.rstrip('/')}{cls.REVIEW_OCR_PATH}"

    @classmethod
    def _timeout_seconds(cls):
        value = _config_value("BACKEND_AI_TIMEOUT_SECONDS") or os.getenv("BACKEND_AI_TIMEOUT_SECONDS") or 20
        try:
            return float(value)
        except (TypeError, ValueError):
            return 20

    @classmethod
    def _internal_token(cls):
        return str(_config_value("AI_INTERNAL_TOKEN") or os.getenv("AI_INTERNAL_TOKEN") or "").strip()

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
