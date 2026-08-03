from app.extensions import db


class BillingProduct(db.Model):
    __tablename__ = "billing_products"
    __table_args__ = (
        db.CheckConstraint("provider in ('TOSS', 'GOOGLE_PLAY', 'MOCK')", name="billing_products_provider_check"),
        db.CheckConstraint("amount >= 0", name="billing_products_amount_check"),
        db.CheckConstraint("currency = 'KRW'", name="billing_products_currency_check"),
        db.CheckConstraint("billing_interval = 'month'", name="billing_products_billing_interval_check"),
        db.UniqueConstraint("provider", "provider_product_id", name="billing_products_provider_product_unique"),
        {"schema": "public"},
    )

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)
    plan_id = db.Column(db.BigInteger, db.ForeignKey("public.subscription_plans.id"), nullable=False)
    provider = db.Column(db.String(30), nullable=False)
    provider_product_id = db.Column(db.String(255), nullable=False)
    amount = db.Column(db.Integer, nullable=False)
    currency = db.Column(db.String(3), nullable=False, default="KRW", server_default="KRW")
    billing_interval = db.Column(db.String(20), nullable=False, default="month", server_default="month")
    active = db.Column(db.Boolean, nullable=False, default=True, server_default=db.text("true"))
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, server_default=db.text("now()"))
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, server_default=db.text("now()"))

    plan = db.relationship("SubscriptionPlan", back_populates="billing_products")
    transactions = db.relationship("PaymentTransaction", back_populates="billing_product")

