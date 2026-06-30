from app.clients.ai_chatbot_client import AIChatbotClient


class ChatbotService:
    MAX_MESSAGE_LENGTH = 800

    ANALYSIS_SUGGESTIONS_KO = [
        "분석 결과를 쉽게 설명해줘요.",
        "점수가 낮은 이유가 뭔가요?",
        "광고 의심도는 무슨 뜻인가요?",
        "이 병원의 장점과 주의점은 무엇인가요?",
        "외국인 친화도는 어떻게 봐야 하나요?",
        "다른 병원과 비교할 때 뭘 봐야 하나요?",
    ]
    ANALYSIS_SUGGESTIONS_EN = [
        "Explain this result simply.",
        "Why is this score low?",
        "What does ad suspicion mean?",
        "What are the strengths and cautions?",
        "How should I read foreigner-friendliness?",
        "What should I compare with other clinics?",
    ]
    GENERAL_SUGGESTIONS_KO = [
        "Filtory는 어떻게 사용하나요?",
        "리뷰 신뢰도는 어떻게 봐야 하나요?",
        "광고 의심도는 무슨 뜻인가요?",
        "병원 선택할 때 무엇을 봐야 하나요?",
        "리뷰를 입력할 때 개인정보는 괜찮나요?",
        "점수가 높으면 무조건 믿어도 되나요?",
    ]
    GENERAL_SUGGESTIONS_EN = [
        "How do I use Filtory?",
        "How should I read review trust?",
        "What does ad suspicion mean?",
        "What should I check before choosing a clinic?",
        "Should I avoid personal information in reviews?",
        "Does a high score mean I can fully trust it?",
    ]

    # Backward-compatible names used by older callers/tests.
    SUGGESTIONS_KO = GENERAL_SUGGESTIONS_KO
    SUGGESTIONS_EN = GENERAL_SUGGESTIONS_EN

    @classmethod
    def answer(cls, payload):
        message = str(payload.get("message") or "").strip()
        if not message:
            raise ValueError("message is required")
        if len(message) > cls.MAX_MESSAGE_LENGTH:
            raise ValueError("message is too long")

        language = cls._normalize_language(payload.get("language"))
        analysis_context = cls._first_dict(
            payload.get("analysis_context"),
            payload.get("analysisContext"),
            payload.get("analysis"),
            payload.get("latestAnalysis"),
        )
        has_context = bool(analysis_context)
        normalized_message = message.lower()
        model_version = None

        guardrail_answer = cls._answer_guardrail_keyword(normalized_message, language, analysis_context)
        if guardrail_answer:
            answer = guardrail_answer
            source = "keyword"
        elif analysis_context and cls._is_analysis_question(normalized_message):
            answer = cls._answer_from_analysis(normalized_message, analysis_context, language)
            source = "analysis"
        else:
            small_talk_answer = cls._answer_small_talk(normalized_message, language, has_context=has_context)
            if small_talk_answer:
                answer = small_talk_answer
                source = "small_talk"
            else:
                keyword_answer = cls._answer_by_keyword(normalized_message, language)
                if keyword_answer:
                    answer = keyword_answer
                    source = "keyword"
                else:
                    ai_answer = cls._answer_by_ai(message, language, analysis_context)
                    if ai_answer:
                        answer = ai_answer["answer"]
                        source = ai_answer["source"]
                        model_version = ai_answer.get("modelVersion")
                    else:
                        answer = cls._default_answer(language, has_context=has_context)
                        source = "default"

        result = {
            "answer": answer,
            "source": source,
            "suggested_questions": cls._suggested_questions(language, has_context=has_context),
        }
        if model_version:
            result["modelVersion"] = model_version
        return result

    @staticmethod
    def _normalize_language(value):
        return "en" if value == "en" else "ko"

    @staticmethod
    def _first_dict(*values):
        for value in values:
            if isinstance(value, dict):
                return value
        return None

    @staticmethod
    def _has_any(text, keywords):
        return any(keyword in text for keyword in keywords)

    @classmethod
    def _suggested_questions(cls, language, has_context=False):
        if has_context:
            return cls.ANALYSIS_SUGGESTIONS_EN if language == "en" else cls.ANALYSIS_SUGGESTIONS_KO
        return cls.GENERAL_SUGGESTIONS_EN if language == "en" else cls.GENERAL_SUGGESTIONS_KO

    @staticmethod
    def _answer_by_ai(message, language, analysis_context=None):
        return AIChatbotClient.answer(message, language=language, analysis_context=analysis_context)

    @classmethod
    def _answer_small_talk(cls, text, language, has_context=False):
        cleaned = "".join(char for char in text if char.isalnum() or char.isspace()).strip()

        if cls._is_greeting(cleaned):
            if language == "en":
                if has_context:
                    return "Hi! I can explain the connected Filtory analysis result in plain language. Ask me about the score, ad suspicion, strengths, or cautions."
                return "Hi! I can help with Filtory. Ask me about review trust, ad-like wording, privacy cautions, or choosing a clinic."
            if has_context:
                return "안녕하세요! 연결된 Filtory 분석 결과를 쉽게 풀어드릴게요. 점수, 광고 의심도, 장점, 주의할 점 중 궁금한 걸 물어보세요."
            return "안녕하세요! Filtory 챗봇이에요. 리뷰 신뢰도, 광고성 문구, 플레이스 완성도, 개인정보 주의점, 병원 선택 기준을 쉽게 설명해드릴게요."

        if cls._has_any(cleaned, ["고마워", "고맙", "감사", "thanks", "thank you", "thx"]):
            if language == "en":
                return "You’re welcome. I’ll keep the explanation practical and cautious, so it helps you compare clinic information without overclaiming."
            return "천만에요. 병원 선택에 도움이 되도록 단정하지 않고, 확인할 포인트 중심으로 차분히 설명해드릴게요."

        if cls._has_any(cleaned, ["뭐해", "누구", "너는", "정체", "who are you", "what are you", "what do you do"]):
            if language == "en":
                return "I’m Filtory’s free guide chatbot. I explain review trust signals, ad-like wording, place completeness, privacy cautions, and foreigner-friendliness without paid AI tokens."
            return "저는 Filtory 무료 안내 챗봇이에요. 유료 AI 토큰 없이 리뷰 신뢰도, 광고성 문구, 플레이스 완성도, 개인정보 주의점, 외국인 친화도 기준을 설명해드려요."

        if cls._has_any(
            cleaned,
            [
                "물어볼거",
                "물어볼 거",
                "질문있",
                "질문 있",
                "궁금한게",
                "궁금한 게",
                "궁금한거",
                "궁금한 거",
                "ask something",
                "have a question",
                "question for you",
            ],
        ):
            if language == "en":
                questions = cls._suggested_questions(language, has_context=has_context)
                return "Of course. Try asking: " + " / ".join(questions[:4])
            questions = cls._suggested_questions(language, has_context=has_context)
            return "물론이죠. 이런 질문을 해보면 좋아요: " + " / ".join(questions[:4])

        if cls._has_any(cleaned, ["도와", "도움", "사용법", "뭘 물어", "help", "how to use", "what can i ask"]):
            if language == "en":
                questions = cls._suggested_questions(language, has_context=has_context)
                return "You can ask practical questions such as: " + " / ".join(questions[:4])
            questions = cls._suggested_questions(language, has_context=has_context)
            return "이렇게 물어볼 수 있어요: " + " / ".join(questions[:4])

        if cls._has_any(cleaned, ["심심", "뭐하지", "bored", "boring", "what should i do"]):
            if language == "en":
                return "If you’re bored, try a quick Filtory check: ask what makes a review trustworthy or what to compare before choosing a clinic."
            return "심심하면 Filtory식으로 가볍게 살펴볼까요? 리뷰 신뢰도 기준이나 병원 선택 전에 비교할 포인트를 물어보면 좋아요."

        if cls._has_any(cleaned, ["똑똑", "잘해", "잘 해", "smart", "clever", "are you good"]):
            if language == "en":
                return "I’m useful within a narrow lane: explaining Filtory review signals clearly. I still avoid medical, legal, or clinic recommendation judgments."
            return "저는 Filtory 리뷰 신호를 쉽게 설명하는 데 특화되어 있어요. 다만 의료 판단, 법적 판단, 병원 직접 추천은 단정하지 않아요."

        if cls._has_any(cleaned, ["믿어도", "정확", "신뢰해도", "can i trust you", "accurate", "trust you"]):
            if language == "en":
                return "You can use me as a reference guide, not as a final authority. Please compare multiple reviews, clinic basics, and professional advice when needed."
            return "저는 최종 판단자가 아니라 참고 안내자예요. 여러 리뷰와 병원 기본 정보를 비교하고, 필요하면 전문가 상담으로 추가 확인해 주세요."

        if cls._has_any(cleaned, ["이름", "이름이 뭐", "your name", "what is your name"]):
            if language == "en":
                return "I’m Filtory’s guide chatbot. I help explain review trust, ad suspicion, place completeness, and clinic comparison points."
            return "저는 Filtory 안내 챗봇이에요. 리뷰 신뢰도, 광고 의심도, 플레이스 완성도, 병원 비교 포인트를 설명해드려요."

        if cls._has_any(cleaned, ["기분", "어때", "how are you", "how do you feel"]):
            if language == "en":
                return "I’m ready to help. Tell me a review or analysis question, and I’ll keep the answer practical and cautious."
            return "저는 도와드릴 준비가 되어 있어요. 리뷰나 분석 결과에 대해 물어보면 차분하고 실용적으로 설명해드릴게요."

        if cls._has_any(cleaned, ["농담", "joke", "tell me a joke"]):
            if language == "en":
                return "Tiny Filtory joke: a review walked into a clinic and said, 'Please be specific, I’m being analyzed.' Now, back to useful signals."
            return "작은 농담 하나요. 리뷰가 병원에 들어가서 말했대요. '저 분석당하는 중이니 구체적으로 써주세요.' 이제 다시 쓸모 있는 신호를 볼까요?"

        if cls._has_any(cleaned, ["짜증", "답답", "frustrated", "annoyed", "stressed"]):
            if language == "en":
                return "That sounds frustrating. We can slow it down: ask one thing at a time, such as score meaning, ad suspicion, or what to compare."
            return "답답할 수 있어요. 하나씩 보면 괜찮습니다. 점수 의미, 광고 의심도, 비교할 정보 중 하나부터 물어보세요."

        if cls._has_any(cleaned, ["모르겠", "어려워", "헷갈", "confused", "hard to understand", "difficult"]):
            if language == "en":
                return "No problem. Ask me to explain it simply, and I’ll break Filtory’s review signals into plain comparison points."
            return "괜찮아요. 쉽게 설명해달라고 하면 Filtory의 리뷰 신호를 비교 포인트 중심으로 풀어서 설명해드릴게요."

        if cls._has_any(cleaned, ["간단히", "한 줄", "짧게", "briefly", "one line", "short answer"]):
            if language == "en":
                return "Sure. I’ll keep it brief: use Filtory as reference, then compare recent reviews and basic clinic information."
            return "좋아요. 한 줄로 말하면, Filtory 결과는 참고 정보로 보고 최근 리뷰와 병원 기본 정보를 함께 비교하면 됩니다."

        if cls._has_any(cleaned, ["자세히", "상세히", "detail", "in detail", "explain more"]):
            if language == "en":
                return "Sure. Ask about a specific score or signal, and I’ll explain what it means, what to check next, and what not to overclaim."
            return "좋아요. 특정 점수나 신호를 물어보면 의미, 추가 확인할 점, 단정하면 안 되는 부분까지 차근차근 설명해드릴게요."

        if cls._has_any(cleaned, ["잘가", "바이", "다음에", "bye", "goodbye", "see you"]):
            if language == "en":
                return "Bye! When you compare clinics later, bring the score, review details, and place information together."
            return "좋아요, 다음에 또 불러주세요. 병원 비교할 때는 점수, 리뷰의 구체성, 병원 기본 정보를 같이 보면 좋아요."

        if cls._has_any(cleaned, ["좋아", "오케이", "알겠", "ㅇㅋ", "ok", "okay", "got it"]):
            if language == "en":
                return "Great. Ask me any clinic-review question when you’re ready."
            return "좋아요. 궁금한 리뷰나 분석 결과가 있으면 바로 물어보세요."

        return None

    @classmethod
    def _is_greeting(cls, text):
        korean_greeting_keywords = [
            "안녕",
            "하이",
            "헬로",
            "반가워",
            "좋은 아침",
        ]
        english_greeting_phrases = [
            "good morning",
            "good afternoon",
            "good evening",
        ]
        english_greeting_words = {"hi", "hello", "hey"}

        if cls._has_any(text, korean_greeting_keywords + english_greeting_phrases):
            return True

        return bool(english_greeting_words.intersection(str(text).split()))

    @classmethod
    def _is_analysis_question(cls, text):
        return cls._has_any(
            text,
            [
                "결과",
                "점수",
                "낮",
                "높",
                "왜",
                "요약",
                "3줄",
                "세 줄",
                "설명",
                "장점",
                "단점",
                "주의",
                "믿",
                "신뢰",
                "광고",
                "외국",
                "플레이스",
                "완성",
                "네이버",
                "리뷰",
                "후기",
                "반복",
                "과장",
                "진짜",
                "가짜",
                "정보",
                "종합",
                "총점",
                "비교",
                "result",
                "score",
                "why",
                "explain",
                "summary",
                "three lines",
                "3 lines",
                "trust",
                "ad suspicion",
                "ad-like",
                "advertising",
                "strength",
                "weakness",
                "caution",
                "foreigner",
                "place",
                "naver",
                "review",
                "repeat",
                "exaggeration",
                "fake",
                "real",
                "overall",
                "total",
                "compare",
            ],
        )

    @classmethod
    def _answer_guardrail_keyword(cls, text, language, context=None):
        hospital_name = cls._context_hospital_name(context, language)

        if cls._has_any(text, ["응급", "응급실", "심한 통증", "출혈", "호흡", "가슴 통증", "마비", "emergency", "severe pain", "bleeding", "chest pain", "shortness of breath"]):
            if language == "en":
                return "If symptoms feel urgent, seek emergency care or call local emergency services now. Filtory cannot diagnose, prescribe, or decide treatment."
            return "응급 증상처럼 느껴지면 지금 바로 응급실이나 지역 응급번호에 연락해 주세요. Filtory는 진단, 처방, 치료 결정을 대신할 수 없습니다."

        if cls._has_any(text, ["진단", "처방", "약 먹", "치료법", "수술해야", "병명", "diagnose", "diagnosis", "prescribe", "prescription", "treatment", "medicine"]):
            if language == "en":
                return "I can explain review signals, but I cannot provide diagnosis, prescriptions, or treatment decisions. Please ask a licensed clinician for medical judgment."
            return "리뷰 신호는 설명할 수 있지만 진단, 처방, 치료 여부는 판단할 수 없어요. 의료 판단은 반드시 의료진에게 직접 상담해 주세요."

        if cls._has_any(text, ["불법", "위반", "의료광고", "법", "신고", "illegal", "violation", "law", "legal", "medical advertising"]):
            if language == "en":
                return "I can point out promotional signals, but I cannot decide whether something is illegal or a medical-advertising violation. Keep evidence and check official guidance or legal advice."
            return "홍보성 의심 신호는 설명할 수 있지만, 의료광고 위반이나 불법 여부를 단정할 수는 없어요. 근거를 보관하고 공식 기준이나 전문가 상담으로 추가 확인하는 게 안전합니다."

        if cls._has_any(text, ["추천해", "추천해줘", "어디가 좋아", "어느 병원", "가야 해", "best clinic", "recommend", "which clinic", "where should i go"]):
            if language == "en":
                return f"I cannot directly recommend one clinic. Use {hospital_name or 'the clinic'} as a reference point and compare trust signals, ad suspicion, recent concrete reviews, place information, distance, and your own needs."
            return f"특정 병원을 직접 추천하거나 대신 골라드리긴 어려워요. {hospital_name or '해당 병원'}의 점수는 참고 정보로 보고, 신뢰도 신호, 광고 의심도, 최근의 구체적인 후기, 병원 기본 정보, 거리와 본인 상황을 함께 비교해 주세요."

        if cls._has_any(text, ["개인정보", "전화번호", "주민", "주소", "저장", "삭제", "보관", "탈퇴", "personal information", "privacy", "phone number", "delete", "stored", "retention"]):
            if language == "en":
                return "Avoid entering personal information such as phone numbers, resident IDs, addresses, or medical record details in reviews or chat. For deletion or retention, use account/data settings or contact service support."
            return "리뷰나 챗봇에는 전화번호, 주민등록번호, 상세 주소, 진료기록처럼 개인을 식별할 수 있는 정보는 입력하지 않는 게 좋아요. 저장/삭제/보관은 마이페이지의 데이터 관리나 고객지원 경로에서 확인해 주세요."

        asks_review_trust = cls._has_any(text, ["리뷰", "후기", "review"]) and cls._has_any(
            text,
            ["믿", "신뢰", "trust"],
        )
        if asks_review_trust:
            if language == "en":
                return (
                    "Use this review as reference, not as proof. Check whether it includes concrete visit details, "
                    "whether wording feels promotional or repeated, and compare it with recent reviews and basic clinic information."
                )
            return (
                "이 리뷰는 증거가 아니라 참고 정보로 보는 게 좋아요. 구체적인 방문 경험이 있는지, 광고성·반복 표현이 있는지, "
                "최근 다른 리뷰와 병원 기본 정보가 함께 맞는지 비교해 주세요."
            )

        if cls._has_any(text, ["점수 낮", "낮은 점수", "낮으면", "나쁜 병원", "bad clinic", "low score", "score is low"]):
            if language == "en":
                return f"A low score does not automatically mean {hospital_name or 'the clinic'} is bad. It means there are caution signals or limited evidence, so compare recent reviews and basic clinic information."
            return f"점수가 낮다고 해서 {hospital_name or '병원'}이 나쁜 병원이라고 단정할 수는 없어요. 주의 신호나 판단 근거 부족이 있다는 뜻에 가깝고, 최근 리뷰와 병원 기본 정보를 추가 확인하는 게 좋습니다."

        if cls._has_any(text, ["점수 높", "높은 점수", "높으면", "무조건 믿", "fully trust", "high score", "score is high"]):
            if language == "en":
                return "A high score is a positive reference, not a guarantee. Still compare multiple reviews, recent details, place information, and whether the review matches your situation."
            return "점수가 높아도 무조건 믿어도 된다는 뜻은 아니에요. 긍정적인 참고 신호로 보되, 여러 리뷰, 최신 내용, 병원 기본 정보, 본인 상황과 맞는지를 함께 확인해 주세요."

        return None

    @classmethod
    def _answer_by_keyword(cls, text, language):
        if cls._has_any(text, ["장점", "강점", "좋은 점", "strength", "strengths", "good point", "pros"]):
            if language == "en":
                return (
                    "To identify this hospital’s strengths, please log in and run or save an analysis first. "
                    "Then I can use the trust score, place completeness, foreigner-friendliness, and summary signals without directly recommending the clinic."
                )
            return (
                "이 병원의 장점을 보려면 먼저 로그인 후 분석하거나 분석 결과를 저장해 주세요. 연결되면 신뢰도 점수, 플레이스 완성도, 외국인 친화도, "
                "요약 신호를 바탕으로 직접 추천은 피하면서 장점과 확인할 점을 설명해드릴게요."
            )

        if cls._has_any(text, ["가짜", "진짜", "허위", "조작", "fake", "real", "false"]):
            if language == "en":
                return (
                    "Filtory does not decide whether a review is real or fake. It organizes signals such as concrete experience, "
                    "ad-like wording, repetition, exaggeration, and category relevance so users can judge more carefully."
                )
            return (
                "Filtory는 리뷰를 진짜/가짜로 단정하지 않아요. 대신 구체적 경험, 광고성 문구, 반복 표현, 과장 표현, "
                "진료 분야와의 관련성을 정리해서 사용자가 더 객관적으로 판단하도록 돕습니다."
            )

        if cls._has_any(text, ["광고", "홍보", "협찬", "이벤트", "ad suspicion", "ad-like", "advertising", "promotion", "promotional"]):
            if language == "en":
                return (
                    "Ad-like wording means expressions that sound promotional, such as event-focused wording, "
                    "strong recommendations, or booking pressure. Filtory treats these as caution signals, not proof of advertising."
                )
            return (
                "광고성 문구는 이벤트, 강력 추천, 예약 유도처럼 홍보 느낌이 강한 표현을 말해요. "
                "Filtory는 이런 표현을 광고 확정이 아니라 추가 확인이 필요한 신호로 봅니다."
            )

        if cls._has_any(text, ["구체", "방문", "상담", "대기", "비용", "가격", "경과", "처방", "specific", "concrete", "visit", "cost"]):
            if language == "en":
                return (
                    "More useful reviews usually include concrete details: consultation process, waiting time, cost, symptoms, "
                    "treatment progress, aftercare, or what the clinic explained. Vague praise alone is weaker evidence."
                )
            return (
                "참고하기 좋은 리뷰는 상담 과정, 대기 시간, 비용, 증상, 치료 경과, 사후관리, 설명받은 내용처럼 구체적인 경험이 들어 있어요. "
                "막연한 칭찬만 있는 리뷰는 판단 근거가 약할 수 있습니다."
            )

        if cls._has_any(text, ["반복", "비슷", "유사", "복붙", "과장", "최고", "강추", "repeat", "similar", "copy", "exaggeration"]):
            if language == "en":
                return (
                    "Repeated or exaggerated wording can be a caution signal. Similar sentence patterns, overly strong praise, "
                    "and repeated keywords may mean the review needs comparison with other sources."
                )
            return (
                "반복되거나 과장된 표현은 주의 신호가 될 수 있어요. 비슷한 문장 구조, 지나치게 강한 칭찬, 반복 키워드가 많으면 "
                "다른 리뷰와 함께 비교해서 보는 게 좋습니다."
            )

        if cls._has_any(text, ["플레이스", "네이버", "완성도", "주소", "전화", "사진", "영상", "홈페이지", "예약", "place", "naver", "address", "photo", "reservation"]):
            if language == "en":
                return (
                    "Place completeness checks whether basic clinic information is easy to verify: name, address, phone number, "
                    "treatment items, clinic description, photos or videos, homepage, and reservation links."
                )
            return (
                "플레이스 완성도는 병원명, 주소, 전화번호, 진료 항목, 병원 소개, 사진/영상, 홈페이지, 예약 링크처럼 "
                "사용자가 병원 정보를 확인하는 데 필요한 기본 정보가 잘 갖춰졌는지를 봅니다."
            )

        if cls._has_any(text, ["점수", "신뢰", "계산", "score", "trust", "calculate"]):
            if language == "en":
                return (
                    "The trust score is a reference score based on concrete experience, repeated wording, "
                    "and promotional signals. It helps comparison, but it is not an absolute judgment."
                )
            return (
                "신뢰도 점수는 구체적인 방문 경험, 반복 표현, 광고성 문구 같은 신호를 종합한 참고 점수예요. "
                "병원 선택을 돕는 비교 기준이지 절대적인 판정은 아닙니다."
            )

        if cls._has_any(text, ["외국", "영어", "구글", "google", "english", "foreigner"]):
            if language == "en":
                return (
                    "Foreigner friendliness looks at signals such as Google Maps presence, English clinic information, "
                    "English reviews, and reservation or homepage links."
                )
            return (
                "외국인 친화도는 구글맵 등록, 영문 병원명, 영어 안내, 영어 리뷰, 예약/홈페이지 링크 같은 정보를 함께 봅니다."
            )

        if cls._has_any(text, ["번역", "영문", "한국어", "언어", "translate", "translation", "language"]):
            if language == "en":
                return (
                    "Filtory supports Korean and English viewing so users can understand review signals more easily. "
                    "When using translated reviews, it is still helpful to check the original wording if possible."
                )
            return (
                "Filtory는 한국어/영어 모드를 통해 리뷰 신호를 쉽게 이해하도록 돕는 방향이에요. "
                "다만 번역된 리뷰는 뉘앙스가 달라질 수 있으니 가능하면 원문 표현도 함께 확인하는 게 좋습니다."
            )

        if cls._has_any(text, ["피부", "피부과", "여드름", "시술", "이벤트", "derma", "dermatology", "skin"]):
            if language == "en":
                return (
                    "For dermatology reviews, check whether the review describes the treatment, consultation, side effects, "
                    "follow-up care, and cost clearly. Event-heavy or before-after-only praise needs extra caution."
                )
            return (
                "피부과 리뷰는 시술/치료 내용, 상담 설명, 부작용 안내, 사후관리, 비용 언급이 구체적인지 보세요. "
                "이벤트 강조나 전후사진 중심의 과한 칭찬만 있으면 추가 확인이 필요합니다."
            )

        if cls._has_any(text, ["안과", "라식", "라섹", "스마일", "검사", "시력", "ophthalmology", "eye", "lasik"]):
            if language == "en":
                return (
                    "For eye clinic reviews, useful signals include exam explanation, surgery suitability, aftercare, recovery, "
                    "side effects, and whether the review mentions equipment or consultation details."
                )
            return (
                "안과 리뷰는 검사 설명, 수술 적합성 안내, 사후관리, 회복 과정, 부작용 안내, 장비나 상담 내용이 구체적인지 보는 게 좋아요."
            )

        if cls._has_any(text, ["치과", "임플란트", "교정", "충치", "사랑니", "과잉", "dental", "dentistry", "implant", "orthodontic"]):
            if language == "en":
                return (
                    "For dental reviews, check cost explanation, treatment necessity, pain, waiting time, follow-up visits, "
                    "and whether the clinic explained alternatives instead of pushing one expensive option."
                )
            return (
                "치과 리뷰는 비용 설명, 치료 필요성, 통증, 대기 시간, 재방문 과정, 대안 설명 여부를 보세요. "
                "비싼 치료만 강하게 권했다는 내용이 반복되면 조심해서 비교하는 게 좋습니다."
            )

        if cls._has_any(text, ["리뷰 수", "후기 수", "최신", "최근", "적어", "적은", "review count", "few reviews", "not many reviews", "recent", "latest"]):
            if language == "en":
                return (
                    "When review count is low, treat the result as a weak signal. Look for concrete recent reviews, "
                    "basic clinic information, and other sources before deciding."
                )
            return (
                "리뷰 수가 적으면 결과를 강한 판단 근거로 보기보다 약한 참고 신호로 보는 게 좋아요. "
                "최근의 구체적인 후기, 병원 기본 정보, 다른 출처를 함께 확인해 주세요."
            )

        if cls._has_any(text, ["비교", "다른 병원", "compare", "another clinic", "other hospital"]):
            if language == "en":
                return (
                    "For comparison, look at trust score, ad suspicion, review count, recent concrete details, "
                    "place completeness, distance, and whether the clinic fits your needs."
                )
            return (
                "병원을 비교할 때는 신뢰도 점수, 광고 의심도, 리뷰 수, 최근 리뷰의 구체성, 병원 기본 정보 완성도, 거리와 본인 상황을 같이 보세요."
            )

        if cls._has_any(text, ["선택", "고르", "봐야", "확인", "choose", "check", "select"]):
            if language == "en":
                return (
                    "Before choosing a clinic, check concrete review details, suspicious promotion signals, address and hours, "
                    "reservation links, and multiple review sources together."
                )
            return (
                "병원을 선택하기 전에는 구체적인 후기 내용, 광고성 의심 신호, 주소와 운영시간, 예약 링크, 여러 리뷰 출처를 함께 확인하는 게 좋아요."
            )

        return None

    @classmethod
    def _answer_from_analysis(cls, text, context, language):
        analysis = cls._analysis_data(context, language)

        if cls._has_any(text, ["3줄", "세 줄", "3 lines", "three lines"]):
            return cls._analysis_three_line_summary(analysis, language)

        if cls._has_any(text, ["장점", "strength", "good"]):
            return cls._analysis_strength_answer(analysis, language)

        if cls._has_any(text, ["단점", "주의", "낮", "weakness", "caution", "low", "why"]):
            return cls._analysis_caution_answer(analysis, language)

        if cls._has_any(text, ["광고", "홍보", "ad suspicion", "ad-like", "advertising", "promotion"]):
            return cls._analysis_ad_answer(analysis, language)

        if cls._has_any(text, ["외국", "영어", "foreigner", "english"]):
            return cls._analysis_foreigner_answer(analysis, language)

        if cls._has_any(text, ["플레이스", "완성", "네이버", "place", "naver", "complete"]):
            return cls._analysis_place_answer(analysis, language)

        if cls._has_any(text, ["리뷰 수", "후기 수", "몇 개", "적어", "적은", "review count", "few reviews", "reviews"]):
            return cls._analysis_review_count_answer(analysis, language)

        return cls._analysis_summary_answer(analysis, language)

    @classmethod
    def _analysis_data(cls, context, language):
        return {
            "hospital_name": cls._string(context, "hospitalName", "hospital_name") or (
                "this clinic" if language == "en" else "이 병원"
            ),
            "total_score": cls._number(context, "totalScore", "total_score", "score"),
            "trust_score": cls._number(context, "trustScore", "trust_score", "score", "totalScore", "total_score"),
            "ad_score": cls._number(context, "adScore", "ad_score", "adSuspicionScore", "ad_suspicion_score"),
            "place_score": cls._number(context, "placeScore", "place_score", "infoCompletenessScore", "info_completeness_score"),
            "foreigner_score": cls._number(
                context,
                "foreignerFriendlyScore",
                "foreigner_friendly_score",
                "foreignerScore",
                "foreigner_score",
            ),
            "ad_level": cls._string(context, "adSuspicion", "ad_suspicion", "adSuspicionLevel", "ad_suspicion_level"),
            "summary": cls._string(context, "summary", "summary_ko", "summary_en"),
            "reasons": cls._list(context, "detectedReasons", "detected_reasons", "detectedPatterns", "detected_patterns"),
            "suspicious_phrases": cls._list(context, "suspiciousPhrases", "suspicious_phrases"),
            "review_count": cls._number(context, "selectedReviewCount", "selected_review_count", "reviewCount", "review_count"),
        }

    @staticmethod
    def _string(context, *keys):
        for key in keys:
            value = context.get(key)
            if value is not None and str(value).strip():
                return str(value).strip()
        return None

    @staticmethod
    def _number(context, *keys):
        for key in keys:
            value = context.get(key)
            try:
                if value is not None and str(value).strip() != "":
                    return int(round(float(value)))
            except (TypeError, ValueError):
                continue
        return None

    @staticmethod
    def _list(context, *keys):
        for key in keys:
            value = context.get(key)
            if isinstance(value, list):
                return [str(item).strip() for item in value if str(item).strip()]
        return []

    @staticmethod
    def _format_score(score):
        return f"{score}/100" if score is not None else None

    @staticmethod
    def _format_items(items, fallback):
        return ", ".join(items[:3]) if items else fallback

    @staticmethod
    def _with_korean_direction_particle(text):
        if not text:
            return text
        last_char = str(text)[-1]
        if not ("가" <= last_char <= "힣"):
            return f"{text}로"
        has_final_consonant = (ord(last_char) - ord("가")) % 28 != 0
        return f"{text}으로" if has_final_consonant else f"{text}로"

    @classmethod
    def _context_hospital_name(cls, context, language):
        if not isinstance(context, dict):
            return None
        return cls._string(context, "hospitalName", "hospital_name") or (
            "this clinic" if language == "en" else "이 병원"
        )

    @classmethod
    def _analysis_summary_answer(cls, analysis, language):
        hospital_name = analysis["hospital_name"]
        total_score_text = cls._format_score(analysis["total_score"])
        trust_score_text = cls._format_score(analysis["trust_score"])
        place_score_text = cls._format_score(analysis["place_score"])
        ad_level = analysis["ad_level"]
        summary = analysis["summary"]
        reasons = analysis["reasons"]

        if language == "en":
            parts = [f"Based on the connected result, {hospital_name}"]
            if total_score_text:
                parts.append(f"has an overall score of {total_score_text}")
            if trust_score_text:
                parts.append(f"a trust score of {trust_score_text}")
            if place_score_text:
                parts.append(f"and a place completeness score of {place_score_text}")
            if ad_level:
                parts.append(f"and ad suspicion is {ad_level}")
            answer = " ".join(parts) + "."
            if summary:
                answer += f" Summary: {summary}"
            if reasons:
                answer += f" Main signals: {cls._format_items(reasons, 'no strong caution signal')}."
            return answer + " Use this as reference, not as a medical or legal judgment."

        parts = [f"연결된 분석 결과 기준으로 {hospital_name}은"]
        if total_score_text:
            parts.append(f"종합 점수가 {total_score_text}이고")
        if trust_score_text:
            parts.append(f"신뢰도 점수가 {trust_score_text}이고")
        if place_score_text:
            parts.append(f"플레이스 완성도는 {place_score_text}이고")
        if ad_level:
            parts.append(f"광고 의심도는 {cls._with_korean_direction_particle(ad_level)} 표시됐어요")
        answer = " ".join(parts).rstrip("이고") + "."
        if summary:
            answer += f" 요약하면 {summary}"
        if reasons:
            answer += f" 주요 근거는 {cls._format_items(reasons, '강한 의심 신호 없음')}입니다."
        return answer + " 이 결과는 병원 선택을 돕는 참고 정보로 봐주세요."

    @classmethod
    def _analysis_three_line_summary(cls, analysis, language):
        hospital_name = analysis["hospital_name"]
        trust_score_text = cls._format_score(analysis["trust_score"]) or "not available"
        ad_level = analysis["ad_level"] or ("not marked" if language == "en" else "별도 표시 없음")
        reasons = cls._format_items(
            analysis["reasons"] or analysis["suspicious_phrases"],
            "no strong signal" if language == "en" else "강한 신호 없음",
        )
        if language == "en":
            return (
                f"1. {hospital_name}: trust score is {trust_score_text}, ad suspicion is {ad_level}.\n"
                f"2. Key signals: {reasons}.\n"
                "3. Use this as reference and compare recent reviews with basic clinic information."
            )
        return (
            f"1. {hospital_name}: 신뢰도 점수는 {trust_score_text}, 광고 의심도는 {ad_level}입니다.\n"
            f"2. 주요 신호는 {reasons}입니다.\n"
            "3. 참고 정보로 보고 최근 리뷰와 병원 기본 정보를 함께 비교해 주세요."
        )

    @classmethod
    def _analysis_caution_answer(cls, analysis, language):
        hospital_name = analysis["hospital_name"]
        caution_items = analysis["reasons"] or analysis["suspicious_phrases"]
        if language == "en":
            score_text = cls._format_score(analysis["trust_score"]) or "not available"
            return (
                f"For {hospital_name}, the trust score is {score_text} and ad suspicion is {analysis['ad_level'] or 'not marked'}. "
                f"Caution signals: {cls._format_items(caution_items, 'not enough concrete signals')}. "
                "A low score is not proof that the clinic is bad; compare multiple reviews and basic clinic information."
            )

        score_text = cls._format_score(analysis["trust_score"]) or "확인되지 않았고"
        return (
            f"{hospital_name}의 신뢰도 점수는 {score_text}, 광고 의심도는 {analysis['ad_level'] or '별도 표시 없음'}입니다. "
            f"주의해서 볼 부분은 {cls._format_items(caution_items, '구체적인 판단 근거 부족')}이에요. "
            "점수가 낮아도 나쁜 병원이라고 단정하지 말고, 다른 후기와 병원 기본 정보를 같이 확인해 주세요."
        )

    @classmethod
    def _analysis_ad_answer(cls, analysis, language):
        hospital_name = analysis["hospital_name"]
        signals = analysis["suspicious_phrases"] or analysis["reasons"]
        score_text = cls._format_score(analysis["ad_score"])
        if language == "en":
            score_part = f" The ad-related score is {score_text}." if score_text else ""
            return (
                f"For {hospital_name}, ad suspicion is {analysis['ad_level'] or 'not marked'}. "
                f"Related signals: {cls._format_items(signals, 'no specific phrase listed')}.{score_part} "
                "This does not prove advertising or a legal violation; it only means extra checking may be useful."
            )

        score_part = f" 광고 관련 점수는 {score_text}입니다." if score_text else ""
        return (
            f"{hospital_name}의 광고 의심도는 {analysis['ad_level'] or '별도 표시 없음'}입니다. "
            f"관련 신호는 {cls._format_items(signals, '별도 문구 없음')}예요.{score_part} "
            "광고나 위법이라고 단정하는 건 아니고, 추가 확인이 필요한 참고 신호로 보면 됩니다."
        )

    @classmethod
    def _analysis_foreigner_answer(cls, analysis, language):
        hospital_name = analysis["hospital_name"]
        score_text = cls._format_score(analysis["foreigner_score"])
        if language == "en":
            if not score_text:
                return f"{hospital_name} does not have a connected foreigner-friendliness score yet."
            return (
                f"{hospital_name}'s foreigner-friendliness score is {score_text}. "
                "Check Google Maps, English information, reservation links, and recent English reviews together."
            )

        if not score_text:
            return f"{hospital_name}의 외국인 친화도 점수는 아직 연결된 결과에서 확인되지 않아요."
        return (
            f"{hospital_name}의 외국인 친화도 점수는 {score_text}입니다. "
            "구글맵 등록, 영어 정보, 예약 링크, 영어 리뷰 여부를 함께 확인해보세요."
        )

    @classmethod
    def _analysis_place_answer(cls, analysis, language):
        hospital_name = analysis["hospital_name"]
        score_text = cls._format_score(analysis["place_score"])
        if language == "en":
            if not score_text:
                return f"{hospital_name} does not have a connected place completeness score yet."
            return (
                f"{hospital_name}'s place completeness score is {score_text}. "
                "This reflects whether basic information such as address, phone, treatment items, photos, homepage, and reservation links is easy to verify."
            )

        if not score_text:
            return f"{hospital_name}의 플레이스 완성도 점수는 아직 연결된 결과에서 확인되지 않아요."
        return (
            f"{hospital_name}의 플레이스 완성도 점수는 {score_text}입니다. "
            "주소, 전화번호, 진료 항목, 사진/영상, 홈페이지, 예약 링크 같은 기본 정보가 잘 갖춰졌는지를 보는 참고 지표예요."
        )

    @classmethod
    def _analysis_review_count_answer(cls, analysis, language):
        hospital_name = analysis["hospital_name"]
        review_count = analysis["review_count"]
        if language == "en":
            if review_count is None:
                return f"{hospital_name} does not have a connected review count yet."
            return (
                f"This connected result used {review_count} review(s). If the count is low, treat it as a weak signal and compare recent concrete reviews and other clinic information."
            )

        if review_count is None:
            return f"{hospital_name}의 연결된 리뷰 수는 아직 확인되지 않아요."
        return (
            f"이 분석은 {hospital_name}의 리뷰 {review_count}개를 기준으로 연결되어 있어요. "
            "리뷰 수가 적다면 강한 결론보다 약한 참고 신호로 보고, 최신의 구체적인 후기와 병원 기본 정보를 함께 확인해 주세요."
        )

    @classmethod
    def _analysis_strength_answer(cls, analysis, language):
        hospital_name = analysis["hospital_name"]
        if language == "en":
            strengths = []
            if analysis["trust_score"] is not None and analysis["trust_score"] >= 70:
                strengths.append("the trust score is relatively positive")
            if analysis["place_score"] is not None and analysis["place_score"] >= 70:
                strengths.append("basic place information looks fairly complete")
            if analysis["foreigner_score"] is not None and analysis["foreigner_score"] >= 60:
                strengths.append("foreigner access signals look usable")
            if analysis["summary"]:
                strengths.append(analysis["summary"])
            return f"For {hospital_name}, " + cls._format_items(strengths, "there is no clear strength signal yet") + "."

        strengths = []
        if analysis["trust_score"] is not None and analysis["trust_score"] >= 70:
            strengths.append("신뢰도 점수가 비교적 양호해요")
        if analysis["place_score"] is not None and analysis["place_score"] >= 70:
            strengths.append("병원 기본 정보가 비교적 잘 갖춰져 있어요")
        if analysis["foreigner_score"] is not None and analysis["foreigner_score"] >= 60:
            strengths.append("외국인 접근성 신호가 어느 정도 갖춰져 있어요")
        if analysis["summary"]:
            strengths.append(analysis["summary"])
        return f"{hospital_name}의 장점은 {cls._format_items(strengths, '아직 뚜렷한 장점 신호가 부족해요')}."

    @staticmethod
    def _default_answer(language, has_context=False):
        if language == "en":
            if has_context:
                return "I can explain the connected result, ad suspicion, trust score, strengths, cautions, or comparison points."
            return "Ask me about Filtory usage, review trust, ad suspicion, privacy cautions, or what to check before choosing a clinic."

        if has_context:
            return "연결된 분석 결과를 기준으로 점수, 광고 의심도, 장단점, 개인정보 주의점, 병원 선택 기준을 설명해드릴 수 있어요."
        return "Filtory 사용법, 리뷰 신뢰도, 광고성 문구, 개인정보 주의점, 병원 선택 기준에 대해 물어보세요."
