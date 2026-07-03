import base64
import json
import logging
import re
from typing import Any

from app.core.config import Settings
from app.schemas.review_analysis_schema import ReviewOcrRequest, ReviewOcrResponse

logger = logging.getLogger(__name__)


class ReviewOcrService:
    MAX_IMAGE_BYTES = 5 * 1024 * 1024

    @classmethod
    def extract(cls, payload: ReviewOcrRequest, settings: Settings) -> ReviewOcrResponse:
        if not settings.gemini_api_key:
            raise RuntimeError("GEMINI_API_KEY is not configured")

        try:
            from google import genai
            from google.genai import types
        except ImportError as exc:
            raise RuntimeError("google-genai package is not installed") from exc

        client = genai.Client(api_key=settings.gemini_api_key)
        image_parts = []
        for image in payload.images:
            image_bytes = cls._decode_image(image.dataBase64)
            image_parts.append(types.Part.from_bytes(data=image_bytes, mime_type=image.mimeType))

        contents = [cls._build_prompt(payload.language), *image_parts]
        config = types.GenerateContentConfig(
            http_options=types.HttpOptions(timeout=max(10000, int(settings.gemini_timeout_seconds * 1000))),
            temperature=0.1,
            max_output_tokens=2000,
        )

        model = settings.gemini_model
        try:
            response = client.models.generate_content(
                model=model,
                contents=contents,
                config=config,
            )
        except Exception as exc:
            logger.warning("Gemini review OCR request failed; model=%s: %r", model, exc)
            raise RuntimeError("Gemini review OCR request failed") from exc

        raw_text = cls._extract_response_text(response)
        reviews = cls._parse_reviews(raw_text)
        return ReviewOcrResponse(
            text="\n\n".join(reviews) if reviews else raw_text,
            reviews=reviews,
            modelVersion=f"gemini-ocr:{model}",
        )

    @classmethod
    def _decode_image(cls, data_base64: str) -> bytes:
        try:
            image_bytes = base64.b64decode(data_base64, validate=True)
        except ValueError as exc:
            raise ValueError("Invalid image data") from exc

        if not image_bytes:
            raise ValueError("Image data is empty")
        if len(image_bytes) > cls.MAX_IMAGE_BYTES:
            raise ValueError("Image file must be 5 MB or smaller")

        return image_bytes

    @staticmethod
    def _build_prompt(language: str) -> str:
        response_language = "Korean" if language == "ko" else "English"
        return (
            "You extract hospital review text from screenshots. "
            "Read only visible user review content from the image. "
            "Ignore app navigation, ratings summary, buttons, ads, menus, clinic metadata, and unrelated UI labels. "
            "Preserve the original review language. "
            "Split separate reviews into separate strings. "
            "Return strict JSON only with this shape: "
            '{"reviews":["review text 1","review text 2"],"text":"all extracted review text"}. '
            f"If no review text is visible, return the same JSON shape with an empty reviews array. "
            f"Use {response_language} only for any unavoidable structural text."
        )

    @staticmethod
    def _extract_response_text(response: Any) -> str:
        text = str(getattr(response, "text", "") or "").strip()
        if text:
            return text

        logger.debug("Gemini OCR response did not include text: %s", response)
        raise ValueError("Gemini OCR response did not include text")

    @classmethod
    def _parse_reviews(cls, raw_text: str) -> list[str]:
        parsed = cls._parse_json_payload(raw_text)
        if isinstance(parsed, dict):
            reviews = parsed.get("reviews")
            if isinstance(reviews, list):
                return cls._normalize_reviews(reviews)
            text = parsed.get("text")
            if isinstance(text, str):
                return cls._split_text_reviews(text)
        if isinstance(parsed, list):
            return cls._normalize_reviews(parsed)

        return cls._split_text_reviews(raw_text)

    @staticmethod
    def _parse_json_payload(raw_text: str) -> Any:
        candidates = [raw_text.strip()]
        fenced_match = re.search(r"```(?:json)?\s*(.*?)```", raw_text, re.DOTALL | re.IGNORECASE)
        if fenced_match:
            candidates.insert(0, fenced_match.group(1).strip())
        object_match = re.search(r"(\{.*\})", raw_text, re.DOTALL)
        if object_match:
            candidates.append(object_match.group(1).strip())

        for candidate in candidates:
            try:
                return json.loads(candidate)
            except (TypeError, ValueError):
                continue

        return None

    @classmethod
    def _split_text_reviews(cls, text: str) -> list[str]:
        normalized = re.sub(r"\r\n?", "\n", text).strip()
        if not normalized:
            return []

        blocks = re.split(r"\n{2,}|(?:^|\n)\s*(?:[-*]|\d+[.)])\s+", normalized)
        return cls._normalize_reviews(blocks)

    @staticmethod
    def _normalize_reviews(items: list[Any]) -> list[str]:
        reviews: list[str] = []
        seen: set[str] = set()
        for item in items:
            if not isinstance(item, str):
                continue
            review = re.sub(r"\s+", " ", item).strip()
            if len(review) < 2:
                continue
            key = review.casefold()
            if key in seen:
                continue
            seen.add(key)
            reviews.append(review)
        return reviews
