import logging
import secrets

from fastapi import APIRouter, Header, HTTPException

from app.core.config import get_settings
from app.schemas.chatbot_schema import ChatbotMessageRequest, ChatbotMessageResponse
from app.services.gemini_chatbot_service import GeminiChatbotService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/chatbot", tags=["chatbot"])


@router.post("/message", response_model=ChatbotMessageResponse)
def create_chatbot_message(
    payload: ChatbotMessageRequest,
    x_internal_token: str | None = Header(default=None, alias="X-Internal-Token"),
):
    settings = get_settings()
    _verify_internal_token(settings.ai_internal_token, x_internal_token)

    try:
        return GeminiChatbotService.answer(payload, settings)
    except RuntimeError as exc:
        logger.warning("Gemini chatbot is unavailable: %s", exc)
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        logger.warning("Gemini chatbot request failed: %s", exc)
        raise HTTPException(status_code=502, detail="Gemini chatbot request failed") from exc


def _verify_internal_token(expected_token: str | None, received_token: str | None):
    if not expected_token:
        return
    if not received_token or not secrets.compare_digest(expected_token, received_token):
        raise HTTPException(status_code=401, detail="Invalid internal token")
