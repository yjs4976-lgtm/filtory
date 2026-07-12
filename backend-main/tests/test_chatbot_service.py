import pytest
from types import SimpleNamespace

import app.services.chatbot_service as chatbot_service_module
from app.services.chatbot_service import ChatbotService
from app.services.token_service import TokenService


def test_chatbot_requires_message():
    with pytest.raises(ValueError):
        ChatbotService.answer({"message": " "})


def test_chatbot_answers_keyword_question_without_ai():
    result = ChatbotService.answer({"message": "광고 의심도가 뭐야?"})

    assert result["source"] == "keyword"
    assert "광고성 문구" in result["answer"]


def test_chatbot_explains_analysis_context_without_ai():
    result = ChatbotService.answer(
        {
            "message": "이 분석 결과 쉽게 설명해줘",
            "analysisContext": {
                "hospitalName": "예시피부과",
                "trustScore": 72,
                "adSuspicionLevel": "medium",
                "summary": "구체적인 상담 내용은 있지만 일부 홍보성 표현이 있습니다.",
                "detectedPatterns": ["광고성 의심 표현 포함"],
            },
        }
    )

    assert result["source"] == "analysis"
    assert "예시피부과" in result["answer"]
    assert "72/100" in result["answer"]
    assert "광고성 의심 표현 포함" in result["answer"]


def test_chatbot_does_not_claim_reviews_are_fake_or_real():
    result = ChatbotService.answer({"message": "이 리뷰 가짜야 진짜야?"})

    assert result["source"] == "keyword"
    assert "진짜/가짜로 단정하지 않아요" in result["answer"]


def test_chatbot_answers_place_completeness_question():
    result = ChatbotService.answer({"message": "네이버 플레이스 완성도는 뭐야?"})

    assert result["source"] == "keyword"
    assert "병원명" in result["answer"]
    assert "예약 링크" in result["answer"]


def test_chatbot_answers_category_specific_question():
    result = ChatbotService.answer({"message": "치과 리뷰에서 뭘 봐야 해?"})

    assert result["source"] == "keyword"
    assert "비용 설명" in result["answer"]
    assert "치료 필요성" in result["answer"]


def test_chatbot_answers_orthopedics_category_question():
    result = ChatbotService.answer({"message": "정형외과 리뷰에서 뭘 봐야 해?"})

    assert result["source"] == "keyword"
    assert "진단 설명" in result["answer"]
    assert "물리치료" in result["answer"]


def test_chatbot_answers_friendly_greeting():
    result = ChatbotService.answer({"message": "안녕!"})

    assert result["source"] == "small_talk"
    assert "안녕하세요" in result["answer"]
    assert "Filtory" in result["answer"]


def test_chatbot_answers_thanks():
    result = ChatbotService.answer({"message": "고마워"})

    assert result["source"] == "small_talk"
    assert "천만에요" in result["answer"]


def test_chatbot_answers_help_request():
    result = ChatbotService.answer({"message": "뭘 물어볼 수 있어?"})

    assert result["source"] == "small_talk"
    assert "Filtory는 어떻게 사용하나요" in result["answer"]


def test_chatbot_recommends_questions_when_user_wants_to_ask():
    result = ChatbotService.answer({"message": "물어볼 거 있어"})

    assert result["source"] == "small_talk"
    assert "이런 질문을 해보면 좋아요" in result["answer"]
    assert "광고 의심도" in result["answer"]
    assert "병원 선택" in result["answer"]


def test_chatbot_returns_general_suggestions_without_analysis_context():
    result = ChatbotService.answer({"message": "안녕"})

    assert result["source"] == "small_talk"
    assert "Filtory는 어떻게 사용하나요?" in result["suggested_questions"]
    assert "리뷰를 입력할 때 개인정보는 괜찮나요?" in result["suggested_questions"]


def test_chatbot_returns_analysis_suggestions_with_analysis_context():
    result = ChatbotService.answer(
        {
            "message": "안녕",
            "analysisContext": {
                "hospitalName": "예시피부과",
                "trustScore": 72,
            },
        }
    )

    assert result["source"] == "small_talk"
    assert "점수가 낮은 이유가 뭔가요?" in result["suggested_questions"]
    assert "이 병원의 장점과 주의점은 무엇인가요?" in result["suggested_questions"]


def test_chatbot_answers_english_basic_question():
    result = ChatbotService.answer({"message": "How should I read the trust score?", "language": "en"})

    assert result["source"] == "keyword"
    assert "reference score" in result["answer"]
    assert "How do I use Filtory?" in result["suggested_questions"]


def test_chatbot_detects_english_message_over_korean_ui_language():
    result = ChatbotService.answer({"message": "How should I read the trust score?", "language": "ko"})

    assert result["source"] == "keyword"
    assert "reference score" in result["answer"]
    assert "How do I use Filtory?" in result["suggested_questions"]


def test_chatbot_keeps_korean_when_korean_message_contains_english_terms():
    result = ChatbotService.answer({"message": "trust score랑 review 기준이 뭐야?", "language": "en"})

    assert result["source"] == "keyword"
    assert "참고 정보" in result["answer"]
    assert "리뷰를 입력할 때 개인정보는 괜찮나요?" in result["suggested_questions"]


def test_chatbot_omits_cross_language_analysis_signals():
    english_result = ChatbotService.answer(
        {
            "message": "Explain this result simply.",
            "language": "en",
            "analysisContext": {
                "hospitalName": "예시피부과",
                "hospitalEnglishName": "Example Clinic",
                "trustScore": 72,
                "summary": "구체적인 상담 내용은 있지만 일부 홍보성 표현이 있습니다.",
                "detectedPatterns": ["광고성 의심 표현 포함", "Specific visit details"],
            },
        }
    )
    korean_result = ChatbotService.answer(
        {
            "message": "이 결과 쉽게 설명해줘",
            "language": "ko",
            "analysisContext": {
                "hospitalName": "예시피부과",
                "trustScore": 72,
                "summary": "Has concrete details but some promotional wording.",
                "detectedPatterns": ["Ad-like wording", "구체적 방문 경험"],
            },
        }
    )

    assert "Example Clinic" in english_result["answer"]
    assert "Specific visit details" in english_result["answer"]
    assert "광고성 의심 표현 포함" not in english_result["answer"]
    assert "구체적인 상담 내용" not in english_result["answer"]
    assert "예시피부과" in korean_result["answer"]
    assert "구체적 방문 경험" in korean_result["answer"]
    assert "Ad-like wording" not in korean_result["answer"]
    assert "Has concrete details" not in korean_result["answer"]


def test_chatbot_uses_english_analysis_labels_without_korean_name_fallback():
    result = ChatbotService.answer(
        {
            "message": "How is the international convenience score?",
            "language": "en",
            "analysisContext": {
                "hospitalName": "예시피부과",
                "globalAccessibilityScore": 40,
                "globalAccessibilityChecks": [
                    {
                        "label": "영문 병원명",
                        "labelEn": "English clinic name",
                        "checked": True,
                    },
                    {
                        "label": "영어 리뷰 참고 가능",
                        "labelEn": "English reviews available",
                        "checked": False,
                    },
                ],
            },
        }
    )

    assert result["source"] == "analysis"
    assert "this clinic" in result["answer"]
    assert "English clinic name" in result["answer"]
    assert "영문 병원명" not in result["answer"]
    assert "예시피부과" not in result["answer"]


def test_chatbot_uses_remote_ai_fallback_when_available(monkeypatch):
    def fake_ai_answer(message, language, analysis_context=None, conversation_context=None):
        return {
            "answer": "AI fallback answer",
            "source": "llm",
            "modelVersion": "gemini:test",
        }

    monkeypatch.setattr(ChatbotService, "_answer_by_ai", staticmethod(fake_ai_answer))

    result = ChatbotService.answer(
        {"message": "조금 다른 방식으로 설명해줄래?"},
        allow_remote_ai=True,
        rate_limit_key="member:1",
    )

    assert result["source"] == "llm"
    assert result["answer"] == "AI fallback answer"
    assert result["modelVersion"] == "gemini:test"


def test_chatbot_does_not_use_remote_ai_without_login(monkeypatch):
    def fake_ai_answer(message, language, analysis_context=None, conversation_context=None):
        raise AssertionError("remote AI should not be called")

    monkeypatch.setattr(ChatbotService, "_answer_by_ai", staticmethod(fake_ai_answer))

    result = ChatbotService.answer({"message": "조금 다른 방식으로 설명해줄래?"})

    assert result["source"] == "default"


def test_chatbot_remote_ai_rate_limit_falls_back_to_default(monkeypatch):
    calls = []
    ChatbotService._remote_ai_rate_limit_hits.clear()
    monkeypatch.setenv("CHATBOT_REMOTE_AI_RATE_LIMIT_MAX_REQUESTS", "1")
    monkeypatch.setenv("CHATBOT_REMOTE_AI_RATE_LIMIT_WINDOW_SECONDS", "60")

    def fake_ai_answer(message, language, analysis_context=None, conversation_context=None):
        calls.append(message)
        return {
            "answer": "AI fallback answer",
            "source": "llm",
            "modelVersion": "gemini:test",
        }

    monkeypatch.setattr(ChatbotService, "_answer_by_ai", staticmethod(fake_ai_answer))

    first_result = ChatbotService.answer(
        {"message": "새로운 표현으로 풀어줄래"},
        allow_remote_ai=True,
        rate_limit_key="member:rate-limited",
    )
    second_result = ChatbotService.answer(
        {"message": "새로운 표현으로 풀어줄래"},
        allow_remote_ai=True,
        rate_limit_key="member:rate-limited",
    )

    assert first_result["source"] == "llm"
    assert second_result["source"] == "default"
    assert calls == ["새로운 표현으로 풀어줄래"]


def test_chatbot_builds_small_recent_context_for_remote_ai(monkeypatch):
    long_content = "긴 답변 " * 80
    messages = [
        SimpleNamespace(role="user", content="첫 질문"),
        SimpleNamespace(role="assistant", content="첫 답변"),
        SimpleNamespace(role="user", content="둘째 질문"),
        SimpleNamespace(role="assistant", content=long_content),
    ]

    monkeypatch.setattr(chatbot_service_module, "has_app_context", lambda: True)
    monkeypatch.setattr(
        chatbot_service_module.ChatbotHistoryRepository,
        "get_recent_messages",
        staticmethod(lambda member_id, conversation_id, limit: messages[-limit:]),
    )

    context = ChatbotService._conversation_context_for_ai(1, 10, "ko")

    assert context["strategy"] == "recent_messages_only"
    assert context["maxMessages"] == ChatbotService.MAX_LLM_CONTEXT_MESSAGES
    assert context["recentMessages"][0] == {"role": "user", "content": "첫 질문"}
    assert len(context["recentMessages"]) == 4
    assert len(context["recentMessages"][-1]["content"]) <= ChatbotService.MAX_LLM_CONTEXT_MESSAGE_LENGTH


def test_chatbot_ignores_invalid_conversation_id_before_ai_and_starts_new_history(monkeypatch):
    captured = {}

    def fake_ai_answer(message, language, analysis_context=None, conversation_context=None):
        captured["conversation_context"] = conversation_context
        return {
            "answer": "AI fallback answer",
            "source": "llm",
            "modelVersion": "gemini:test",
        }

    def fake_save_exchange(**kwargs):
        captured["saved_conversation_id"] = kwargs["conversation_id"]
        return 111

    monkeypatch.setattr(chatbot_service_module, "has_app_context", lambda: True)
    monkeypatch.setattr(
        chatbot_service_module.ChatbotHistoryRepository,
        "get_conversation",
        staticmethod(lambda member_id, conversation_id: None),
    )
    monkeypatch.setattr(ChatbotService, "_answer_by_ai", staticmethod(fake_ai_answer))
    monkeypatch.setattr(chatbot_service_module.ChatbotHistoryService, "save_exchange", staticmethod(fake_save_exchange))
    ChatbotService._remote_ai_rate_limit_hits.clear()

    result = ChatbotService.answer(
        {"message": "새로운 표현으로 설명해줘", "conversationId": 999},
        member_id=1,
        allow_remote_ai=True,
        rate_limit_key="member:invalid-conversation",
    )

    assert result["source"] == "llm"
    assert result["conversationId"] == 111
    assert captured["conversation_context"] == {}
    assert captured["saved_conversation_id"] is None


def test_ai_chatbot_client_returns_none_when_remote_disabled(monkeypatch):
    from app.clients.ai_chatbot_client import AIChatbotClient

    monkeypatch.setenv("ENABLE_REMOTE_CHATBOT", "false")
    monkeypatch.setenv("AI_CHATBOT_API_URL", "http://127.0.0.1:8000/api/chatbot/message")

    assert AIChatbotClient._api_url() is None


def test_ai_chatbot_client_returns_none_without_internal_token(monkeypatch):
    from app.clients.ai_chatbot_client import AIChatbotClient

    def fake_urlopen(request, timeout):
        raise AssertionError("remote chatbot should not be called without an internal token")

    monkeypatch.setenv("ENABLE_REMOTE_CHATBOT", "true")
    monkeypatch.setenv("AI_CHATBOT_API_URL", "http://127.0.0.1:8000/api/chatbot/message")
    monkeypatch.delenv("AI_INTERNAL_TOKEN", raising=False)
    monkeypatch.setattr("urllib.request.urlopen", fake_urlopen)

    assert AIChatbotClient.answer("hello", language="en") is None


def test_ai_chatbot_client_sends_internal_token_header(monkeypatch):
    from app.clients.ai_chatbot_client import AIChatbotClient

    captured_headers = {}

    class FakeResponse:
        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, traceback):
            return False

        def read(self):
            return b'{"answer":"ok","source":"llm","modelVersion":"gemini:test"}'

    def fake_urlopen(request, timeout):
        captured_headers.update(request.headers)
        return FakeResponse()

    monkeypatch.setenv("ENABLE_REMOTE_CHATBOT", "true")
    monkeypatch.setenv("AI_CHATBOT_API_URL", "http://127.0.0.1:8000/api/chatbot/message")
    monkeypatch.setenv("AI_INTERNAL_TOKEN", "secret-token")
    monkeypatch.setattr("urllib.request.urlopen", fake_urlopen)

    result = AIChatbotClient.answer("hello", language="en")

    assert result["source"] == "llm"
    assert captured_headers["X-internal-token"] == "secret-token"


def test_chatbot_filters_analysis_context_before_ai_fallback(monkeypatch):
    captured_context = {}

    def fake_ai_answer(message, language, analysis_context=None, conversation_context=None):
        captured_context.update(analysis_context or {})
        return {
            "answer": "AI fallback answer",
            "source": "llm",
            "modelVersion": "gemini:test",
        }

    monkeypatch.setattr(ChatbotService, "_answer_by_ai", staticmethod(fake_ai_answer))

    result = ChatbotService.answer(
        {
            "message": "다른 말투로 풀어줄래",
            "analysisContext": {
                "hospitalName": "예시피부과",
                "trustScore": 72,
                "summary": "구체적인 상담 내용이 있습니다.",
                "reviewText": "010-1234-5678 진료기록 원문",
                "phone": "010-1234-5678",
                "email": "user@example.com",
                "address": "서울시 상세주소",
            },
        },
        allow_remote_ai=True,
        rate_limit_key="member:2",
    )

    assert result["source"] == "llm"
    assert captured_context == {
        "hospitalName": "예시피부과",
        "trustScore": 72,
        "summary": "구체적인 상담 내용이 있습니다.",
    }


def test_english_this_does_not_trigger_hi_greeting():
    strength_result = ChatbotService.answer({"message": "What are this hospital's strengths?", "language": "en"})
    compare_result = ChatbotService.answer({"message": "Compare this with another hospital.", "language": "en"})
    trust_result = ChatbotService.answer({"message": "Can I trust this review?", "language": "en"})

    assert strength_result["source"] == "keyword"
    assert "log in and run or save an analysis" in strength_result["answer"]
    assert not strength_result["answer"].startswith("Hi!")

    assert compare_result["source"] == "keyword"
    assert "For comparison" in compare_result["answer"]
    assert not compare_result["answer"].startswith("Hi!")

    assert trust_result["source"] == "keyword"
    assert "Use this review as reference" in trust_result["answer"]
    assert not trust_result["answer"].startswith("Hi!")


def test_review_trust_question_gets_review_specific_answer():
    ko_result = ChatbotService.answer({"message": "이 리뷰 믿어도 돼?"})
    ko_punctuated_result = ChatbotService.answer({"message": "이 리뷰, 믿을 만한가요?"})
    en_result = ChatbotService.answer({"message": "Can I trust this review?", "language": "en"})

    assert ko_result["source"] == "keyword"
    assert "증거가 아니라 참고 정보" in ko_result["answer"]
    assert "광고성·반복 표현" in ko_result["answer"]

    assert ko_punctuated_result["source"] == "keyword"
    assert "증거가 아니라 참고 정보" in ko_punctuated_result["answer"]

    assert en_result["source"] == "keyword"
    assert "Use this review as reference" in en_result["answer"]
    assert "promotional or repeated" in en_result["answer"]


def test_chatbot_api_does_not_treat_this_as_hi():
    from app import create_app

    client = create_app().test_client()
    response = client.post(
        "/api/chatbot/message",
        json={"message": "Can I trust this review?", "language": "en"},
    )
    payload = response.get_json()

    assert response.status_code == 200
    assert payload["data"]["source"] == "keyword"
    assert "Use this review as reference" in payload["data"]["answer"]
    assert not payload["data"]["answer"].startswith("Hi!")


def test_chatbot_api_allows_remote_ai_for_logged_in_user(monkeypatch):
    from app import create_app

    app = create_app()
    client = app.test_client()

    def fake_ai_answer(message, language, analysis_context=None, conversation_context=None):
        return {
            "answer": "AI fallback answer",
            "source": "llm",
            "modelVersion": "gemini:test",
        }

    monkeypatch.setattr(ChatbotService, "_answer_by_ai", staticmethod(fake_ai_answer))
    monkeypatch.setattr(
        chatbot_service_module.ChatbotHistoryService,
        "save_exchange",
        staticmethod(lambda **kwargs: 456),
    )
    ChatbotService._remote_ai_rate_limit_hits.clear()

    with app.app_context():
        access_token = TokenService.create_access_token_for_identity(123)
    client.set_cookie("access_token_cookie", access_token)

    response = client.post(
        "/api/chatbot/message",
        json={"message": "조금 다른 방식으로 설명해줄래?"},
    )
    payload = response.get_json()

    assert response.status_code == 200
    assert payload["data"]["source"] == "llm"
    assert payload["data"]["answer"] == "AI fallback answer"
    assert payload["data"]["conversationId"] == 456


def test_chatbot_api_keeps_remote_ai_off_for_anonymous_user(monkeypatch):
    from app import create_app

    client = create_app().test_client()

    def fake_ai_answer(message, language, analysis_context=None, conversation_context=None):
        raise AssertionError("remote AI should not be called")

    def fake_save_exchange(**kwargs):
        raise AssertionError("anonymous chat should stay client-side")

    monkeypatch.setattr(ChatbotService, "_answer_by_ai", staticmethod(fake_ai_answer))
    monkeypatch.setattr(chatbot_service_module.ChatbotHistoryService, "save_exchange", staticmethod(fake_save_exchange))

    response = client.post(
        "/api/chatbot/message",
        json={"message": "조금 다른 방식으로 설명해줄래?"},
    )
    payload = response.get_json()

    assert response.status_code == 200
    assert "conversationId" not in payload["data"]
    assert payload["data"]["source"] == "default"


def test_chatbot_conversation_list_requires_login():
    from app import create_app

    client = create_app().test_client()
    response = client.get("/api/chatbot/conversations")

    assert response.status_code == 401


def test_chatbot_conversation_list_returns_items_for_logged_in_user(monkeypatch):
    import app.api.chatbot_api as chatbot_api_module
    import app.utils.security as security_module
    from app import create_app

    app = create_app()
    client = app.test_client()
    monkeypatch.setattr(
        security_module.MemberRepository,
        "get_by_id",
        staticmethod(lambda member_id: SimpleNamespace(id=int(member_id), active=True, deleted_at=None, role="user")),
    )
    monkeypatch.setattr(
        chatbot_api_module.ChatbotHistoryService,
        "list_conversations",
        staticmethod(lambda member_id, limit, offset: ([{"id": 10, "title": "최근 대화"}], 1)),
    )

    with app.app_context():
        access_token = TokenService.create_access_token_for_identity(123)
    client.set_cookie("access_token_cookie", access_token)

    response = client.get("/api/chatbot/conversations")
    payload = response.get_json()

    assert response.status_code == 200
    assert payload["data"][0]["id"] == 10
    assert payload["meta"]["count"] == 1


def test_chatbot_conversation_detail_returns_404_for_other_member(monkeypatch):
    import app.api.chatbot_api as chatbot_api_module
    import app.utils.security as security_module
    from app import create_app

    app = create_app()
    client = app.test_client()
    monkeypatch.setattr(
        security_module.MemberRepository,
        "get_by_id",
        staticmethod(lambda member_id: SimpleNamespace(id=int(member_id), active=True, deleted_at=None, role="user")),
    )
    monkeypatch.setattr(
        chatbot_api_module.ChatbotHistoryService,
        "get_conversation",
        staticmethod(lambda member_id, conversation_id: (_ for _ in ()).throw(ValueError("Chatbot conversation not found"))),
    )

    with app.app_context():
        access_token = TokenService.create_access_token_for_identity(123)
    client.set_cookie("access_token_cookie", access_token)

    response = client.get("/api/chatbot/conversations/999")

    assert response.status_code == 404


def test_chatbot_conversation_detail_returns_owned_conversation(monkeypatch):
    import app.api.chatbot_api as chatbot_api_module
    import app.utils.security as security_module
    from app import create_app

    app = create_app()
    client = app.test_client()
    monkeypatch.setattr(
        security_module.MemberRepository,
        "get_by_id",
        staticmethod(lambda member_id: SimpleNamespace(id=int(member_id), active=True, deleted_at=None, role="user")),
    )
    monkeypatch.setattr(
        chatbot_api_module.ChatbotHistoryService,
        "get_conversation",
        staticmethod(lambda member_id, conversation_id: {"id": conversation_id, "memberId": member_id, "messages": []}),
    )

    with app.app_context():
        access_token = TokenService.create_access_token_for_identity(123)
    client.set_cookie("access_token_cookie", access_token)

    response = client.get("/api/chatbot/conversations/10")
    payload = response.get_json()

    assert response.status_code == 200
    assert payload["data"]["id"] == 10
    assert payload["data"]["memberId"] == 123


def test_chatbot_api_accepts_anonymous_analysis_context_with_result_id():
    from app import create_app

    client = create_app().test_client()
    response = client.post(
        "/api/chatbot/message",
        json={
            "message": "분석 결과 쉽게 설명해줘",
            "analysisResultId": 123,
            "analysisContext": {
                "hospitalName": "테스트치과",
                "trustScore": 75,
                "adSuspicionScore": 20,
                "summary": "리뷰가 비교적 구체적이고 광고성 표현은 낮아요.",
            },
        },
    )
    payload = response.get_json()

    assert response.status_code == 200
    assert payload["data"]["source"] == "analysis"
    assert "75" in payload["data"]["answer"]


def test_chatbot_uses_local_analysis_context_when_logged_in_result_lookup_fails(monkeypatch):
    def fail_result_lookup(analysis_result_id, member_id):
        raise ValueError("Analysis result not found or not accessible")

    monkeypatch.setattr(ChatbotService, "build_analysis_chat_context", fail_result_lookup)

    result = ChatbotService.answer(
        {
            "message": "분석 결과 쉽게 설명해줘",
            "analysisResultId": 999,
            "analysisContext": {
                "hospitalName": "임시분석치과",
                "trustScore": 68,
                "adSuspicionScore": 30,
                "summary": "임시 분석 결과입니다.",
            },
        },
        member_id=1,
        allow_remote_ai=True,
        rate_limit_key="member:1",
    )

    assert result["source"] == "analysis"
    assert "임시분석치과" in result["answer"]
    assert "68/100" in result["answer"]


def test_chatbot_explains_analysis_in_three_lines():
    result = ChatbotService.answer(
        {
            "message": "분석 결과 3줄로 요약해줘",
            "analysisContext": {
                "hospitalName": "예시치과",
                "trustScore": 64,
                "adSuspicionLevel": "medium",
                "detectedPatterns": ["반복 표현 포함"],
            },
        }
    )

    assert result["source"] == "analysis"
    assert "1. 예시치과" in result["answer"]
    assert "2. 주요 신호" in result["answer"]
    assert "3. 참고 정보" in result["answer"]


def test_analysis_context_has_priority_over_small_talk_detail_keyword():
    result = ChatbotService.answer(
        {
            "message": "분석 결과 간단히 설명해줘",
            "analysisContext": {
                "hospitalName": "예시피부과",
                "trustScore": 72,
                "adSuspicionLevel": "medium",
                "detectedPatterns": ["광고성 의심 표현 포함"],
            },
        }
    )

    assert result["source"] == "analysis"
    assert "예시피부과" in result["answer"]
    assert "72/100" in result["answer"]


def test_chatbot_prefers_localized_ad_suspicion_over_level_key():
    result = ChatbotService.answer(
        {
            "message": "분석 결과 설명해줘",
            "analysisContext": {
                "hospitalName": "예시피부과",
                "trustScore": 72,
                "adSuspicion": "보통",
                "adSuspicionLevel": "medium",
            },
        }
    )

    assert result["source"] == "analysis"
    assert "광고 의심도는 보통으로" in result["answer"]
    assert "medium" not in result["answer"]


def test_chatbot_does_not_directly_recommend_clinic():
    result = ChatbotService.answer({"message": "어느 병원 추천해줘?"})

    assert result["source"] == "keyword"
    assert "직접 추천" in result["answer"]
    assert "함께 비교" in result["answer"]


def test_chatbot_does_not_decide_medical_ad_violation():
    result = ChatbotService.answer({"message": "이거 의료광고 위반이야?"})

    assert result["source"] == "keyword"
    assert "단정할 수는 없어요" in result["answer"]
    assert "추가 확인" in result["answer"]


def test_chatbot_refuses_emergency_or_diagnosis_judgment():
    emergency_result = ChatbotService.answer({"message": "가슴 통증이 심한데 응급이야?"})
    diagnosis_result = ChatbotService.answer({"message": "이 증상 병명 진단해줘"})

    assert emergency_result["source"] == "keyword"
    assert "응급실" in emergency_result["answer"]
    assert diagnosis_result["source"] == "keyword"
    assert "진단, 처방, 치료 여부" in diagnosis_result["answer"]


def test_chatbot_answers_privacy_question():
    result = ChatbotService.answer({"message": "개인정보 저장 삭제 보관은 어떻게 돼?"})

    assert result["source"] == "keyword"
    assert "개인을 식별할 수 있는 정보" in result["answer"]
    assert "저장/삭제/보관" in result["answer"]


def test_chatbot_answers_more_small_talk_types():
    cases = [
        ("심심해", "small_talk", "가볍게"),
        ("너 똑똑해?", "small_talk", "특화"),
        ("너 믿어도 돼?", "small_talk", "참고 안내자"),
        ("이름이 뭐야?", "small_talk", "Filtory 안내 챗봇"),
        ("기분 어때?", "small_talk", "준비"),
        ("농담해줘", "small_talk", "농담"),
        ("짜증나", "small_talk", "하나씩"),
        ("모르겠어 어려워", "small_talk", "쉽게 설명"),
        ("한 줄로 간단히 설명해줘", "small_talk", "한 줄"),
        ("자세히 설명해줘", "small_talk", "차근차근"),
    ]

    for message, source, expected_text in cases:
        result = ChatbotService.answer({"message": message})
        assert result["source"] == source
        assert expected_text in result["answer"]


def test_chatbot_answers_more_small_talk_types_in_english():
    cases = [
        ("bored", "quick Filtory check"),
        ("are you smart?", "narrow lane"),
        ("can I trust you?", "reference guide"),
        ("what is your name?", "Filtory"),
        ("how are you?", "ready to help"),
        ("tell me a joke", "Tiny Filtory joke"),
        ("I'm frustrated", "one thing at a time"),
        ("I'm confused", "plain comparison points"),
        ("briefly please", "keep it brief"),
        ("explain in detail", "what not to overclaim"),
    ]

    for message, expected_text in cases:
        result = ChatbotService.answer({"message": message, "language": "en"})
        assert result["source"] == "small_talk"
        assert expected_text in result["answer"]
