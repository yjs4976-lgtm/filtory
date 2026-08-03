from app.extensions import db


class MemberBillingProfile(db.Model):
    __tablename__ = "member_billing_profiles"
    __table_args__ = (
        db.CheckConstraint("provider in ('TOSS', 'GOOGLE_PLAY', 'MOCK')", name="member_billing_profiles_provider_check"),
        db.CheckConstraint(
            "status in ('pending', 'active', 'revoked', 'verification_required')",
            name="member_billing_profiles_status_check",
        ),
        db.UniqueConstraint("member_id", "provider", name="member_billing_profiles_member_provider_unique"),
        db.UniqueConstraint("provider", "customer_key", name="member_billing_profiles_provider_customer_unique"),
        {"schema": "public"},
    )

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)
    member_id = db.Column(db.BigInteger, db.ForeignKey("public.members.id", ondelete="CASCADE"), nullable=False)
    provider = db.Column(db.String(30), nullable=False)
    customer_key = db.Column(db.String(255), nullable=False)
    encrypted_billing_key = db.Column(db.Text)
    encryption_key_version = db.Column(db.String(30))
    status = db.Column(db.String(30), nullable=False, default="pending", server_default="pending")
    card_company = db.Column(db.String(100))
    card_number_masked = db.Column(db.String(100))
    authenticated_at = db.Column(db.DateTime(timezone=True))
    last_verified_at = db.Column(db.DateTime(timezone=True))
    revoked_at = db.Column(db.DateTime(timezone=True))
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, server_default=db.text("now()"))
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, server_default=db.text("now()"))

    transactions = db.relationship("PaymentTransaction", back_populates="billing_profile")

