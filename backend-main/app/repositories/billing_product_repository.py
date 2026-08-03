from sqlalchemy.orm import joinedload

from app.models import BillingProduct, SubscriptionPlan


class BillingProductRepository:
    @staticmethod
    def get_active_by_provider_product_id(provider, provider_product_id):
        return BillingProduct.query.options(joinedload(BillingProduct.plan)).filter(
            BillingProduct.provider == provider,
            BillingProduct.provider_product_id == provider_product_id,
            BillingProduct.active.is_(True),
        ).first()

    @staticmethod
    def get_active_plus_product(provider):
        return BillingProduct.query.join(SubscriptionPlan).options(joinedload(BillingProduct.plan)).filter(
            BillingProduct.provider == provider,
            BillingProduct.active.is_(True),
            SubscriptionPlan.plan_code == "plus",
            SubscriptionPlan.active.is_(True),
        ).first()

