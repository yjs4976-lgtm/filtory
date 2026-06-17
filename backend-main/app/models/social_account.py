from app.extensions import db


class SocialAccount(db.Model):
    __tablename__ = "social_accounts"
    __table_args__ = (
        db.CheckConstraint("provider in ('kakao', 'naver', 'google')", name="social_accounts_provider_check"),
        db.UniqueConstraint("provider", "social_id", name="social_accounts_provider_social_id_unique"),
        db.UniqueConstraint("member_id", "provider", name="social_accounts_member_provider_unique"),
        {"schema": "public"},
    )

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)
    member_id = db.Column(
        db.BigInteger,
        db.ForeignKey("public.members.id", ondelete="CASCADE"),
        nullable=False,
    )
    provider = db.Column(db.String(30), nullable=False)
    social_id = db.Column(db.String(255), nullable=False)
    social_email = db.Column(db.String(255))
    social_nickname = db.Column(db.String(100))
    profile_img_url = db.Column(db.Text)
    connected_at = db.Column(db.DateTime(timezone=True), nullable=False, server_default=db.text("now()"))
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, server_default=db.text("now()"))

    member = db.relationship("Member", back_populates="social_accounts")

    def __repr__(self):
        return f"<SocialAccount id={self.id} provider={self.provider}>"
