from app.extensions import db


class PaymentTransaction(db.Model):
    __tablename__ = "payment_transactions"
    __table_args__ = (
        db.CheckConstraint("provider in ('TOSS', 'GOOGLE_PLAY', 'MOCK')", name="payment_transactions_provider_check"),
        db.CheckConstraint("transaction_type in ('INITIAL', 'RENEWAL', 'CANCEL', 'REFUND')", name="payment_transactions_type_check"),
        db.CheckConstraint(
            "status in ('READY', 'IN_PROGRESS', 'DONE', 'FAILED', 'CANCELED', 'PARTIAL_CANCELED', 'ABORTED', 'EXPIRED')",
            name="payment_transactions_status_check",
        ),
        db.CheckConstraint("amount >= 0", name="payment_transactions_amount_check"),
        db.UniqueConstraint("provider", "order_id", name="payment_transactions_provider_order_unique"),
        db.UniqueConstraint("provider", "payment_key", name="payment_transactions_provider_payment_unique"),
        {"schema": "public"},
    )

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)
    member_id = db.Column(db.BigInteger, db.ForeignKey("public.members.id", ondelete="CASCADE"), nullable=False)
    subscription_id = db.Column(db.BigInteger, db.ForeignKey("public.member_subscriptions.id", ondelete="SET NULL"))
    billing_product_id = db.Column(db.BigInteger, db.ForeignKey("public.billing_products.id"), nullable=False)
    billing_profile_id = db.Column(db.BigInteger, db.ForeignKey("public.member_billing_profiles.id", ondelete="SET NULL"))
    provider = db.Column(db.String(30), nullable=False)
    transaction_type = db.Column(db.String(30), nullable=False)
    order_id = db.Column(db.String(255), nullable=False)
    payment_key = db.Column(db.String(255))
    idempotency_key = db.Column(db.Uuid(as_uuid=True), nullable=False, unique=True)
    amount = db.Column(db.Integer, nullable=False)
    currency = db.Column(db.String(3), nullable=False, default="KRW", server_default="KRW")
    status = db.Column(db.String(30), nullable=False, default="READY", server_default="READY")
    requested_at = db.Column(db.DateTime(timezone=True), nullable=False, server_default=db.text("now()"))
    approved_at = db.Column(db.DateTime(timezone=True))
    canceled_at = db.Column(db.DateTime(timezone=True))
    failure_code = db.Column(db.String(100))
    failure_message = db.Column(db.Text)
    raw_response_json = db.Column(db.JSON)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, server_default=db.text("now()"))
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, server_default=db.text("now()"))

    subscription = db.relationship("MemberSubscription", back_populates="payment_transactions")
    billing_product = db.relationship("BillingProduct", back_populates="transactions")
    billing_profile = db.relationship("MemberBillingProfile", back_populates="transactions")

