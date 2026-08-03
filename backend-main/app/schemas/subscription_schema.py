def _isoformat(value):
    return value.isoformat() if value else None


SUBSCRIPTION_PLAN_FIELDS = {
    "plan_code",
    "plan_name",
    "monthly_price",
    "monthly_analysis_limit",
    "description",
    "currency",
    "billing_interval",
    "active",
}

MEMBER_SUBSCRIPTION_FIELDS = {
    "member_id",
    "plan_id",
    "status",
    "started_at",
    "current_period_start",
    "current_period_end",
    "cancel_at_period_end",
    "canceled_at",
    "payment_provider",
    "payment_customer_id",
    "payment_subscription_id",
    "provider_product_id",
    "provider_purchase_id",
    "last_verified_at",
    "grace_period_end",
    "ended_at",
    "auto_renew",
    "metadata_json",
}


def subscription_plan_to_dict(plan):
    if plan is None:
        return None

    return {
        "id": plan.id,
        "plan_code": plan.plan_code,
        "plan_name": plan.plan_name,
        "monthly_price": plan.monthly_price,
        "monthly_analysis_limit": plan.monthly_analysis_limit,
        "description": plan.description,
        "currency": plan.currency,
        "billing_interval": plan.billing_interval,
        "active": plan.active,
        "created_at": _isoformat(plan.created_at),
        "updated_at": _isoformat(plan.updated_at),
    }


def member_subscription_to_dict(subscription):
    if subscription is None:
        return None

    return {
        "id": subscription.id,
        "member_id": subscription.member_id,
        "plan_id": subscription.plan_id,
        "status": subscription.status,
        "started_at": _isoformat(subscription.started_at),
        "current_period_start": _isoformat(subscription.current_period_start),
        "current_period_end": _isoformat(subscription.current_period_end),
        "cancel_at_period_end": subscription.cancel_at_period_end,
        "canceled_at": _isoformat(subscription.canceled_at),
        "payment_provider": subscription.payment_provider,
        "payment_customer_id": subscription.payment_customer_id,
        "payment_subscription_id": subscription.payment_subscription_id,
        "provider_product_id": subscription.provider_product_id,
        "provider_purchase_id": subscription.provider_purchase_id,
        "last_verified_at": _isoformat(subscription.last_verified_at),
        "grace_period_end": _isoformat(subscription.grace_period_end),
        "ended_at": _isoformat(subscription.ended_at),
        "auto_renew": subscription.auto_renew,
        "metadata_json": subscription.metadata_json,
        "created_at": _isoformat(subscription.created_at),
        "updated_at": _isoformat(subscription.updated_at),
    }


def member_subscription_to_public_dict(subscription):
    """구독 상태 응답에서 결제사 연결키와 내부 metadata를 제거한다."""
    if subscription is None:
        return None
    return {
        "id": subscription.id,
        "member_id": subscription.member_id,
        "plan_id": subscription.plan_id,
        "status": subscription.status,
        "started_at": _isoformat(subscription.started_at),
        "current_period_start": _isoformat(subscription.current_period_start),
        "current_period_end": _isoformat(subscription.current_period_end),
        "cancel_at_period_end": subscription.cancel_at_period_end,
        "canceled_at": _isoformat(subscription.canceled_at),
        "payment_provider": subscription.payment_provider,
        "provider_product_id": subscription.provider_product_id,
        "last_verified_at": _isoformat(subscription.last_verified_at),
        "grace_period_end": _isoformat(subscription.grace_period_end),
        "ended_at": _isoformat(subscription.ended_at),
        "auto_renew": subscription.auto_renew,
        "created_at": _isoformat(subscription.created_at),
        "updated_at": _isoformat(subscription.updated_at),
    }


def extract_subscription_plan_data(payload):
    return {
        key: payload[key]
        for key in SUBSCRIPTION_PLAN_FIELDS
        if key in payload
    }


def extract_member_subscription_data(payload):
    return {
        key: payload[key]
        for key in MEMBER_SUBSCRIPTION_FIELDS
        if key in payload
    }
