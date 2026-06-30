import logging

from fastapi import APIRouter, HTTPException

from app.core.config import get_settings
from app.schemas.chatbot_schema import ChatbotMessageRequest, ChatbotMessageResponse
from app.services.gemini_chatbot_service import GeminiChatbotService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/chatbot", tags=["chatbot"])


@router.post("/message", response_model=ChatbotMessageResponse)
def create_chatbot_message(payload: ChatbotMessageRequest):
    settings = get_settings()

    try:
        return GeminiChatbotService.answer(payload, settings)
    except RuntimeError as exc:
        logger.warning("Gemini chatbot is unavailable: %s", exc)
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        logger.warning("Gemini chatbot request failed: %s", exc)
        raise HTTPException(status_code=502, detail="Gemini chatbot request failed") from exc
