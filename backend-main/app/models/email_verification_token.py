from app.extensions import db


class EmailVerificationToken(db.Model):
    __tablename__ = "email_verification_tokens"
    __table_args__ = {"schema": "public"}

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)
    member_id = db.Column(
        db.BigInteger,
        db.ForeignKey("public.members.id", ondelete="CASCADE"),
        nullable=False,
    )
    token_hash = db.Column(db.Text, nullable=False, unique=True)
    expires_at = db.Column(db.DateTime(timezone=True), nullable=False)
    used_at = db.Column(db.DateTime(timezone=True))
    request_ip = db.Column(db.String(100))
    user_agent = db.Column(db.Text)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, server_default=db.text("now()"))

    member = db.relationship("Member", back_populates="email_verification_tokens")

    def __repr__(self):
        return f"<EmailVerificationToken id={self.id} member_id={self.member_id}>"
