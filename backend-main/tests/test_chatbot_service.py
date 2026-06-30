import pytest

from app.services.chatbot_service import ChatbotService


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
