from datetime import datetime, timezone

from sqlalchemy import or_
from sqlalchemy.orm import joinedload

from app.extensions import db
from app.models import MemberSubscription, SubscriptionPlan


class SubscriptionRepository:
    VALID_CURRENT_STATUSES = {
        "active", "trialing", "cancel_scheduled", "grace_period", "past_due", "on_hold", "verification_required"
    }
    @staticmethod
    def get_plan_by_id(plan_id):
        return db.session.get(SubscriptionPlan, plan_id)

    @staticmethod
    def get_plan_by_code(plan_code):
        return SubscriptionPlan.query.filter(SubscriptionPlan.plan_code == plan_code).first()

    @staticmethod
    def list_active_plans():
        return (
            SubscriptionPlan.query
            .filter(SubscriptionPlan.active.is_(True))
            .order_by(SubscriptionPlan.monthly_price.asc())
            .all()
        )

    @staticmethod
    def get_member_subscription_by_id(subscription_id):
        return db.session.get(MemberSubscription, subscription_id)

    @staticmethod
    def get_current_member_subscription(member_id):
        now = datetime.now(timezone.utc)
        return (
            MemberSubscription.query.options(joinedload(MemberSubscription.plan))
            .filter(
                MemberSubscription.member_id == member_id,
                MemberSubscription.status.in_(SubscriptionRepository.VALID_CURRENT_STATUSES),
                or_(MemberSubscription.current_period_end.is_(None), MemberSubscription.current_period_end > now),
            )
            .order_by(MemberSubscription.created_at.desc())
            .first()
        )

    @staticmethod
    def get_current_paid_subscription(member_id):
        now = datetime.now(timezone.utc)
        return (
            MemberSubscription.query.join(SubscriptionPlan)
            .options(joinedload(MemberSubscription.plan))
            .filter(
                MemberSubscription.member_id == member_id,
                SubscriptionPlan.plan_code != "free",
                MemberSubscription.status.in_(SubscriptionRepository.VALID_CURRENT_STATUSES),
                or_(MemberSubscription.current_period_end.is_(None), MemberSubscription.current_period_end > now),
            )
            .order_by(MemberSubscription.created_at.desc())
            .first()
        )

    @staticmethod
    def create_member_subscription(data):
        subscription = MemberSubscription(**data)
        db.session.add(subscription)
        return subscription

    @staticmethod
    def update_member_subscription(subscription, data):
        for key, value in data.items():
            setattr(subscription, key, value)
        return subscription

    @staticmethod
    def commit():
        db.session.commit()

    @staticmethod
    def rollback():
        db.session.rollback()
