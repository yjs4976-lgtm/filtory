from app.extensions import db


class ChatbotMessage(db.Model):
    __tablename__ = "chatbot_messages"
    __table_args__ = (
        db.CheckConstraint("role in ('user', 'assistant')", name="chatbot_messages_role_check"),
        {"schema": "public"},
    )

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)
    conversation_id = db.Column(
        db.BigInteger,
        db.ForeignKey("public.chatbot_conversations.id", ondelete="CASCADE"),
        nullable=False,
    )
    member_id = db.Column(db.BigInteger, db.ForeignKey("public.members.id", ondelete="CASCADE"), nullable=False)
    role = db.Column(db.String(20), nullable=False)
    content = db.Column(db.Text, nullable=False)
    source = db.Column(db.String(30))
    model_version = db.Column(db.String(100))
    metadata_json = db.Column(db.JSON)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, server_default=db.text("now()"))

    conversation = db.relationship("ChatbotConversation", back_populates="messages")
    member = db.relationship("Member", back_populates="chatbot_messages")

    def __repr__(self):
        return f"<ChatbotMessage id={self.id} role={self.role}>"
