from app.extensions import db
from app.models import PaymentWebhookEvent


class PaymentWebhookRepository:
    @staticmethod
    def get_by_deduplication_key(provider, key, *, for_update=False):
        """웹훅을 조회하고 필요하면 재처리 경쟁을 막기 위해 행을 잠근다."""
        query = PaymentWebhookEvent.query.filter(
            PaymentWebhookEvent.provider == provider,
            PaymentWebhookEvent.deduplication_key == key,
        )
        if for_update:
            query = query.with_for_update()
        return query.first()

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
