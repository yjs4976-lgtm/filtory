from typing import Any, Literal

from pydantic import BaseModel, Field


class ChatbotMessageRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=800)
    language: Literal["ko", "en"] = "ko"
    analysisContext: dict[str, Any] | None = None


class ChatbotMessageResponse(BaseModel):
    answer: str
    source: Literal["llm"] = "llm"
    modelVersion: str
