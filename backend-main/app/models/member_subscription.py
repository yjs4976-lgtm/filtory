from app.extensions import db


class MemberSubscription(db.Model):
    __tablename__ = "member_subscriptions"
    __table_args__ = (
        db.CheckConstraint(
            "status in ('pending', 'active', 'trialing', 'cancel_scheduled', 'grace_period', "
            "'past_due', 'on_hold', 'canceled', 'expired', 'refunded', 'verification_required')",
            name="member_subscriptions_status_check",
        ),
        {"schema": "public"},
    )

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)
    member_id = db.Column(
        db.BigInteger,
        db.ForeignKey("public.members.id", ondelete="CASCADE"),
        nullable=False,
    )
    plan_id = db.Column(db.BigInteger, db.ForeignKey("public.subscription_plans.id"), nullable=False)
    status = db.Column(db.String(30), nullable=False, default="active", server_default="active")
    started_at = db.Column(db.DateTime(timezone=True), nullable=False, server_default=db.text("now()"))
    current_period_start = db.Column(db.DateTime(timezone=True))
    current_period_end = db.Column(db.DateTime(timezone=True))
    cancel_at_period_end = db.Column(db.Boolean, nullable=False, default=False, server_default=db.text("false"))
    canceled_at = db.Column(db.DateTime(timezone=True))
    payment_provider = db.Column(db.String(30))
    payment_customer_id = db.Column(db.String(255))
    payment_subscription_id = db.Column(db.String(255))
    provider_product_id = db.Column(db.String(255))
    provider_purchase_id = db.Column(db.String(255))
    last_verified_at = db.Column(db.DateTime(timezone=True))
    grace_period_end = db.Column(db.DateTime(timezone=True))
    ended_at = db.Column(db.DateTime(timezone=True))
    auto_renew = db.Column(db.Boolean, nullable=False, default=True, server_default=db.text("true"))
    metadata_json = db.Column(db.JSON)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, server_default=db.text("now()"))
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, server_default=db.text("now()"))

    member = db.relationship("Member", back_populates="subscriptions")
    plan = db.relationship("SubscriptionPlan", back_populates="member_subscriptions")
    payment_transactions = db.relationship("PaymentTransaction", back_populates="subscription")

    def __repr__(self):
        return f"<MemberSubscription id={self.id} status={self.status}>"
