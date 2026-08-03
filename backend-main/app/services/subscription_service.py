from app.extensions import db
from app.repositories import SubscriptionRepository
from app.schemas import (
    extract_member_subscription_data,
    member_subscription_to_dict,
    subscription_plan_to_dict,
)


class SubscriptionService:
    """구독 플랜과 현재 entitlement를 읽기 위한 서비스 경계다.

    결제 승인 자체는 PaymentService가 담당하며, 이 서비스는 검증된 구독 상태를
    사용자 응답으로 변환해 결제 로직과 조회 로직의 책임을 분리한다.
    """

    STATUSES = {
        "pending", "active", "trialing", "cancel_scheduled", "grace_period", "past_due", "on_hold",
        "canceled", "expired", "refunded", "verification_required",
    }

    @staticmethod
    def list_active_plans():
        plans = SubscriptionRepository.list_active_plans()
        return [subscription_plan_to_dict(plan) for plan in plans]

    @staticmethod
    def get_current_member_subscription(member_id):
        subscription = SubscriptionRepository.get_current_member_subscription(member_id)
        if not subscription:
            raise ValueError("Current subscription not found")
        return member_subscription_to_dict(subscription)

    @staticmethod
    def create_member_subscription(payload):
        data = extract_member_subscription_data(payload)

        if not data.get("member_id") or not data.get("plan_id"):
            raise ValueError("member_id and plan_id are required")

        if data.get("status") and data["status"] not in SubscriptionService.STATUSES:
            raise ValueError("Invalid subscription status")

        try:
            subscription = SubscriptionRepository.create_member_subscription(data)
            db.session.commit()
            return member_subscription_to_dict(subscription)
        except Exception:
            db.session.rollback()
            raise

    @staticmethod
    def update_member_subscription(subscription_id, payload):
        subscription = SubscriptionRepository.get_member_subscription_by_id(subscription_id)
        if not subscription:
            raise ValueError("Subscription not found")

        data = extract_member_subscription_data(payload)

        if data.get("status") and data["status"] not in SubscriptionService.STATUSES:
            raise ValueError("Invalid subscription status")

        try:
            subscription = SubscriptionRepository.update_member_subscription(subscription, data)
            db.session.commit()
            return member_subscription_to_dict(subscription)
        except Exception:
            db.session.rollback()
            raise
