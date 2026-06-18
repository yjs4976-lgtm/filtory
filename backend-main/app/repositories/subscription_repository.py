from app.extensions import db
from app.models import MemberSubscription, SubscriptionPlan


class SubscriptionRepository:
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
        return (
            MemberSubscription.query
            .filter(
                MemberSubscription.member_id == member_id,
                MemberSubscription.status.in_(["active", "trialing", "past_due"]),
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
