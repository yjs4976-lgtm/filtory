from app.extensions import db


class SubscriptionPlan(db.Model):
    __tablename__ = "subscription_plans"
    __table_args__ = (
        db.CheckConstraint("plan_code in ('free', 'plus', 'business')", name="subscription_plans_code_check"),
        db.CheckConstraint("currency = 'KRW'", name="subscription_plans_currency_check"),
        db.CheckConstraint("billing_interval = 'month'", name="subscription_plans_billing_interval_check"),
        db.CheckConstraint("monthly_price >= 0", name="subscription_plans_monthly_price_check"),
        db.CheckConstraint(
            "monthly_analysis_limit is null or monthly_analysis_limit >= 0",
            name="subscription_plans_monthly_analysis_limit_check",
        ),
        {"schema": "public"},
    )

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)
    plan_code = db.Column(db.String(30), nullable=False, unique=True)
    plan_name = db.Column(db.String(100), nullable=False)
    monthly_price = db.Column(db.Integer, nullable=False, default=0, server_default="0")
    monthly_analysis_limit = db.Column(db.Integer)
    description = db.Column(db.Text)
    currency = db.Column(db.String(3), nullable=False, default="KRW", server_default="KRW")
    billing_interval = db.Column(db.String(20), nullable=False, default="month", server_default="month")
    active = db.Column(db.Boolean, nullable=False, default=True, server_default=db.text("true"))
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, server_default=db.text("now()"))
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, server_default=db.text("now()"))

    member_subscriptions = db.relationship("MemberSubscription", back_populates="plan")
    billing_products = db.relationship("BillingProduct", back_populates="plan")

    def __repr__(self):
        return f"<SubscriptionPlan id={self.id} plan_code={self.plan_code}>"
