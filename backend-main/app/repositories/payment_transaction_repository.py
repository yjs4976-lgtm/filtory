from app.extensions import db
from app.models import PaymentTransaction


class PaymentTransactionRepository:
    @staticmethod
    def get_by_order_id(provider, order_id):
        return PaymentTransaction.query.filter(
            PaymentTransaction.provider == provider,
            PaymentTransaction.order_id == order_id,
        ).first()

    @staticmethod
    def get_by_payment_key(provider, payment_key):
        if not payment_key:
            return None
        return PaymentTransaction.query.filter(
            PaymentTransaction.provider == provider,
            PaymentTransaction.payment_key == payment_key,
        ).first()

    @staticmethod
    def get_by_idempotency_key(idempotency_key):
        return PaymentTransaction.query.filter(PaymentTransaction.idempotency_key == idempotency_key).first()

    @staticmethod
    def get_resumable_initial(member_id, billing_product_id):
        return PaymentTransaction.query.filter(
            PaymentTransaction.member_id == member_id,
            PaymentTransaction.billing_product_id == billing_product_id,
            PaymentTransaction.transaction_type == "INITIAL",
            PaymentTransaction.status.in_(["READY", "IN_PROGRESS"]),
        ).order_by(PaymentTransaction.created_at.desc()).first()

    @staticmethod
    def list_by_member(member_id, limit=50):
        return PaymentTransaction.query.filter(PaymentTransaction.member_id == member_id).order_by(
            PaymentTransaction.created_at.desc()
        ).limit(limit).all()

    @staticmethod
    def create(data):
        transaction = PaymentTransaction(**data)
        db.session.add(transaction)
        return transaction

    @staticmethod
    def update(transaction, data):
        for key, value in data.items():
            setattr(transaction, key, value)
        return transaction
