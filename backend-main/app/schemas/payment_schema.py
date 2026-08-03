def _isoformat(value):
    return value.isoformat() if value else None


def billing_product_to_dict(product):
    return {
        "id": product.id,
        "planCode": product.plan.plan_code if product.plan else None,
        "provider": product.provider,
        "providerProductId": product.provider_product_id,
        "amount": product.amount,
        "currency": product.currency,
        "billingInterval": product.billing_interval,
    }


def billing_profile_to_dict(profile):
    return {
        "provider": profile.provider,
        "customerKey": profile.customer_key,
        "status": profile.status,
        "cardCompany": profile.card_company,
        "cardNumberMasked": profile.card_number_masked,
        "authenticatedAt": _isoformat(profile.authenticated_at),
        "lastVerifiedAt": _isoformat(profile.last_verified_at),
    }


def billing_profile_to_public_dict(profile):
    """사용자 응답에서 provider 식별키와 암호화 소재를 제외한다."""
    if profile is None:
        return None
    return {
        "provider": profile.provider,
        "status": profile.status,
        "cardCompany": profile.card_company,
        "cardNumberMasked": profile.card_number_masked,
        "authenticatedAt": _isoformat(profile.authenticated_at),
        "lastVerifiedAt": _isoformat(profile.last_verified_at),
    }


def payment_transaction_to_dict(transaction):
    return {
        "id": transaction.id,
        "subscriptionId": transaction.subscription_id,
        "provider": transaction.provider,
        "transactionType": transaction.transaction_type,
        "orderId": transaction.order_id,
        "paymentKey": transaction.payment_key,
        "amount": transaction.amount,
        "currency": transaction.currency,
        "status": transaction.status,
        "requestedAt": _isoformat(transaction.requested_at),
        "approvedAt": _isoformat(transaction.approved_at),
        "canceledAt": _isoformat(transaction.canceled_at),
        "failureCode": transaction.failure_code,
        "failureMessage": transaction.failure_message,
    }


def payment_transaction_to_public_dict(transaction):
    """결제 내역 표시에 필요한 값만 반환하며 provider 내부 키는 노출하지 않는다."""
    if transaction is None:
        return None
    return {
        "id": transaction.id,
        "subscriptionId": transaction.subscription_id,
        "provider": transaction.provider,
        "transactionType": transaction.transaction_type,
        "orderId": transaction.order_id,
        "amount": transaction.amount,
        "currency": transaction.currency,
        "status": transaction.status,
        "requestedAt": _isoformat(transaction.requested_at),
        "approvedAt": _isoformat(transaction.approved_at),
        "canceledAt": _isoformat(transaction.canceled_at),
        "failureCode": transaction.failure_code,
        "failureMessage": transaction.failure_message,
    }
