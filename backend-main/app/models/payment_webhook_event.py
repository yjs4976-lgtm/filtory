from app.extensions import db


class PaymentWebhookEvent(db.Model):
    __tablename__ = "payment_webhook_events"
    __table_args__ = (
        db.CheckConstraint("provider in ('TOSS', 'GOOGLE_PLAY', 'MOCK')", name="payment_webhook_events_provider_check"),
        db.CheckConstraint(
            "processing_status in ('RECEIVED', 'PROCESSED', 'IGNORED', 'FAILED')",
            name="payment_webhook_events_status_check",
        ),
        db.UniqueConstraint("provider", "deduplication_key", name="payment_webhook_events_provider_dedup_unique"),
        {"schema": "public"},
    )

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)
    provider = db.Column(db.String(30), nullable=False)
    event_type = db.Column(db.String(100), nullable=False)
    deduplication_key = db.Column(db.String(255), nullable=False)
    payment_key = db.Column(db.String(255))
    processing_status = db.Column(db.String(30), nullable=False, default="RECEIVED", server_default="RECEIVED")
    payload_json = db.Column(db.JSON, nullable=False, default=dict)
    received_at = db.Column(db.DateTime(timezone=True), nullable=False, server_default=db.text("now()"))
    processed_at = db.Column(db.DateTime(timezone=True))
    error_message = db.Column(db.Text)

