import json

import pytest
from fastapi import HTTPException
from types import SimpleNamespace

from app.api.chatbot_api import _verify_internal_token, create_chatbot_message
from app.schemas.chatbot_schema import ChatbotMessageRequest, ChatbotMessageResponse
from app.services.gemini_chatbot_service import GeminiChatbotService


def test_chatbot_internal_token_configuration_is_required():
    with pytest.raises(HTTPException) as exc:
        _verify_internal_token(None, None)

    assert exc.value.status_code == 503


def test_chatbot_internal_token_header_is_required():
    with pytest.raises(HTTPException) as exc:
        _verify_internal_token("secret-token", None)

    assert exc.value.status_code == 401


def test_chatbot_invalid_internal_token_is_rejected():
    with pytest.raises(HTTPException) as exc:
        _verify_internal_token("secret-token", "wrong-token")

    assert exc.value.status_code == 401


def test_chatbot_matching_internal_token_is_accepted():
    _verify_internal_token("secret-token", "secret-token")


def test_chatbot_message_accepts_conversation_context(monkeypatch):
    from app.api import chatbot_api

    def fake_answer(payload, settings):
        assert payload.conversationContext["recentMessages"][0]["role"] == "user"
        return ChatbotMessageResponse(answer="ok", source="llm", modelVersion="gemini:test")

    monkeypatch.setattr(chatbot_api, "get_settings", lambda: SimpleNamespace(ai_internal_token="secret-token"))
    monkeypatch.setattr(chatbot_api.GeminiChatbotService, "answer", staticmethod(fake_answer))

    response = create_chatbot_message(
        ChatbotMessageRequest(
            message="이어서 설명해줘",
            language="ko",
            analysisContext={},
            conversationContext={
                "strategy": "recent_messages_only",
                "recentMessages": [{"role": "user", "content": "앞 질문"}],
            },
        ),
        x_internal_token="secret-token",
    )

    assert response.answer == "ok"


def test_chatbot_prompt_includes_limited_conversation_context():
    long_text = "긴 이전 답변 " * 80
    content = GeminiChatbotService._build_user_content(
        ChatbotMessageRequest(
            message="이어서 설명해줘",
            language="ko",
            analysisContext={},
            conversationContext={
                "recentMessages": [
                    {"role": "system", "content": "제외"},
                    {"role": "user", "content": "앞 질문"},
                    {"role": "assistant", "content": long_text},
                ],
            },
        )
    )

    payload = json.loads(content)
    recent_messages = payload["conversationContext"]["recentMessages"]

    assert payload["conversationContext"]["strategy"] == "recent_messages_only"
    assert recent_messages[0] == {"role": "user", "content": "앞 질문"}
    assert recent_messages[1]["role"] == "assistant"
    assert len(recent_messages[1]["content"]) <= GeminiChatbotService.MAX_CONTEXT_MESSAGE_LENGTH
