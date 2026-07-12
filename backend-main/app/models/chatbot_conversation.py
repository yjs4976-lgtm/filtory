from app.extensions import db


class ChatbotConversation(db.Model):
    __tablename__ = "chatbot_conversations"
    __table_args__ = (
        {"schema": "public"},
    )

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)
    member_id = db.Column(db.BigInteger, db.ForeignKey("public.members.id", ondelete="CASCADE"), nullable=False)
    analysis_result_id = db.Column(db.BigInteger, db.ForeignKey("public.analysis_results.id", ondelete="SET NULL"))
    title = db.Column(db.String(120), nullable=False, default="Filtory 챗봇 대화", server_default="Filtory 챗봇 대화")
    language = db.Column(db.String(20), nullable=False, default="ko", server_default="ko")
    last_message_preview = db.Column(db.String(160))
    message_count = db.Column(db.Integer, nullable=False, default=0, server_default="0")
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, server_default=db.text("now()"))
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, server_default=db.text("now()"))

    member = db.relationship("Member", back_populates="chatbot_conversations")
    messages = db.relationship(
        "ChatbotMessage",
        back_populates="conversation",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="ChatbotMessage.created_at.asc()",
    )

    def __repr__(self):
        return f"<ChatbotConversation id={self.id} member_id={self.member_id}>"
