from sqlalchemy.orm import joinedload

from app.extensions import db
from app.models import ChatbotConversation, ChatbotMessage


class ChatbotHistoryRepository:
    @staticmethod
    def list_conversations(member_id, limit=20, offset=0):
        query = ChatbotConversation.query.filter(ChatbotConversation.member_id == member_id)
        total = query.count()
        items = (
            query.order_by(ChatbotConversation.updated_at.desc(), ChatbotConversation.id.desc())
            .limit(limit)
            .offset(offset)
            .all()
        )
        return items, total

    @staticmethod
    def get_conversation(member_id, conversation_id):
        return (
            ChatbotConversation.query.options(joinedload(ChatbotConversation.messages))
            .filter(
                ChatbotConversation.id == conversation_id,
                ChatbotConversation.member_id == member_id,
            )
            .first()
        )

    @staticmethod
    def get_recent_messages(member_id, conversation_id, limit=6):
        rows = (
            ChatbotMessage.query.join(ChatbotConversation)
            .filter(
                ChatbotMessage.conversation_id == conversation_id,
                ChatbotMessage.member_id == member_id,
                ChatbotConversation.member_id == member_id,
            )
            .order_by(ChatbotMessage.created_at.desc(), ChatbotMessage.id.desc())
            .limit(limit)
            .all()
        )
        return list(reversed(rows))

    @staticmethod
    def create_conversation(data):
        conversation = ChatbotConversation(**data)
        db.session.add(conversation)
        return conversation

    @staticmethod
    def create_message(data):
        message = ChatbotMessage(**data)
        db.session.add(message)
        return message

    @staticmethod
    def commit():
        db.session.commit()

    @staticmethod
    def rollback():
        db.session.rollback()
