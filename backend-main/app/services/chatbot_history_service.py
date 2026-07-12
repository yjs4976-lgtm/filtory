from datetime import datetime, timezone

from app.repositories.chatbot_history_repository import ChatbotHistoryRepository


class ChatbotHistoryService:
    MAX_TITLE_LENGTH = 80
    MAX_PREVIEW_LENGTH = 120

    @classmethod
    def list_conversations(cls, member_id, limit=20, offset=0):
        items, total = ChatbotHistoryRepository.list_conversations(member_id, limit=limit, offset=offset)
        return [cls._conversation_to_dict(item, include_messages=False) for item in items], total

    @classmethod
    def get_conversation(cls, member_id, conversation_id):
        conversation = ChatbotHistoryRepository.get_conversation(member_id, conversation_id)
        if not conversation:
            raise ValueError("Chatbot conversation not found")
        return cls._conversation_to_dict(conversation, include_messages=True)

    @classmethod
    def save_exchange(
        cls,
        *,
        member_id,
        message,
        answer,
        language,
        source,
        model_version=None,
        conversation_id=None,
        analysis_result_id=None,
    ):
        if not member_id:
            return None

        conversation = None
        if conversation_id:
            conversation = ChatbotHistoryRepository.get_conversation(member_id, conversation_id)
            if not conversation:
                raise ValueError("Chatbot conversation not found")

        if not conversation:
            conversation = ChatbotHistoryRepository.create_conversation(
                {
                    "member_id": member_id,
                    "analysis_result_id": analysis_result_id,
                    "title": cls._title_from_message(message),
                    "language": language,
                }
            )
        elif analysis_result_id and not conversation.analysis_result_id:
            conversation.analysis_result_id = analysis_result_id

        ChatbotHistoryRepository.create_message(
            {
                "conversation": conversation,
                "member_id": member_id,
                "role": "user",
                "content": message,
                "metadata_json": {"language": language, "analysisResultId": analysis_result_id},
            }
        )
        ChatbotHistoryRepository.create_message(
            {
                "conversation": conversation,
                "member_id": member_id,
                "role": "assistant",
                "content": answer,
                "source": source,
                "model_version": model_version,
                "metadata_json": {"language": language, "analysisResultId": analysis_result_id},
            }
        )

        conversation.message_count = int(conversation.message_count or 0) + 2
        conversation.language = language
        conversation.last_message_preview = cls._truncate(answer, cls.MAX_PREVIEW_LENGTH)
        conversation.updated_at = datetime.now(timezone.utc)
        ChatbotHistoryRepository.commit()
        return conversation.id

    @classmethod
    def _conversation_to_dict(cls, conversation, include_messages=False):
        data = {
            "id": conversation.id,
            "memberId": conversation.member_id,
            "analysisResultId": conversation.analysis_result_id,
            "title": conversation.title,
            "language": conversation.language,
            "lastMessagePreview": conversation.last_message_preview,
            "messageCount": conversation.message_count,
            "createdAt": conversation.created_at.isoformat() if conversation.created_at else None,
            "updatedAt": conversation.updated_at.isoformat() if conversation.updated_at else None,
        }
        if include_messages:
            data["messages"] = [cls._message_to_dict(message) for message in conversation.messages]
        return data

    @staticmethod
    def _message_to_dict(message):
        return {
            "id": message.id,
            "conversationId": message.conversation_id,
            "role": message.role,
            "content": message.content,
            "source": message.source,
            "modelVersion": message.model_version,
            "createdAt": message.created_at.isoformat() if message.created_at else None,
        }

    @classmethod
    def _title_from_message(cls, message):
        title = cls._truncate(str(message or "").strip().replace("\n", " "), cls.MAX_TITLE_LENGTH)
        return title or "Filtory 챗봇 대화"

    @staticmethod
    def _truncate(value, limit):
        text = str(value or "").strip()
        return text if len(text) <= limit else f"{text[:limit - 1]}…"
