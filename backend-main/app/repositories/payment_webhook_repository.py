from app.extensions import db
from app.models import PaymentWebhookEvent


class PaymentWebhookRepository:
    @staticmethod
    def get_by_deduplication_key(provider, key):
        return PaymentWebhookEvent.query.filter(
            PaymentWebhookEvent.provider == provider,
            PaymentWebhookEvent.deduplication_key == key,
        ).first()

    @staticmethod
    def create(data):
        event = PaymentWebhookEvent(**data)
        db.session.add(event)
        return event

    @staticmethod
    def update(event, data):
        for key, value in data.items():
            setattr(event, key, value)
        return event

