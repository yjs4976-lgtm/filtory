from app.extensions import db
from app.models import MemberBillingProfile


class MemberBillingProfileRepository:
    @staticmethod
    def get_by_member_provider(member_id, provider):
        return MemberBillingProfile.query.filter(
            MemberBillingProfile.member_id == member_id,
            MemberBillingProfile.provider == provider,
        ).first()

    @staticmethod
    def get_by_customer_key(provider, customer_key):
        return MemberBillingProfile.query.filter(
            MemberBillingProfile.provider == provider,
            MemberBillingProfile.customer_key == customer_key,
        ).first()

    @staticmethod
    def create(data):
        profile = MemberBillingProfile(**data)
        db.session.add(profile)
        return profile

    @staticmethod
    def update(profile, data):
        for key, value in data.items():
            setattr(profile, key, value)
        return profile

