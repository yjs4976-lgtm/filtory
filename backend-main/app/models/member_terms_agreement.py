from app.extensions import db


class MemberTermsAgreement(db.Model):
    __tablename__ = "member_terms_agreements"
    __table_args__ = (
        db.CheckConstraint(
            "agreement_type in ('terms', 'privacy', 'marketing')",
            name="member_terms_agreements_type_check",
        ),
        db.UniqueConstraint(
            "member_id",
            "agreement_type",
            "version",
            name="member_terms_agreements_member_type_version_unique",
        ),
        {"schema": "public"},
    )

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)
    member_id = db.Column(
        db.BigInteger,
        db.ForeignKey("public.members.id", ondelete="CASCADE"),
        nullable=False,
    )
    agreement_type = db.Column(db.String(30), nullable=False)
    version = db.Column(db.String(50), nullable=False, default="v1", server_default="v1")
    agreed = db.Column(db.Boolean, nullable=False, default=True, server_default=db.text("true"))
    agreed_at = db.Column(db.DateTime(timezone=True), nullable=False, server_default=db.text("now()"))
    revoked_at = db.Column(db.DateTime(timezone=True))
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, server_default=db.text("now()"))
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, server_default=db.text("now()"))

    member = db.relationship("Member", back_populates="terms_agreements")

    def __repr__(self):
        return f"<MemberTermsAgreement id={self.id} type={self.agreement_type}>"
