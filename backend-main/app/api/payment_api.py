from flask import Blueprint, current_app, g, request

from app.clients.toss_payments_client import TossPaymentsError
from app.services.payment_service import (
    PaymentConfigurationError,
    PaymentDisabledError,
    PaymentService,
    PaymentVerificationError,
)
from app.utils.crypto import BillingKeyEncryptionError
from app.utils.response import error_response, success_response
from app.utils.security import require_auth, require_payment_origin

payment_bp = Blueprint("payments", __name__)


def _payment_error(error):
    if isinstance(error, PaymentDisabledError):
        return error_response(str(error), 503)
    if isinstance(error, (PaymentConfigurationError, BillingKeyEncryptionError)):
        return error_response(str(error), 503)
    if isinstance(error, PermissionError):
        return error_response(str(error), 403)
    if isinstance(error, TossPaymentsError):
        return error_response("Payment provider request failed", 502)
    if isinstance(error, PaymentVerificationError):
        return error_response("Payment verification failed", 502)
    return error_response(str(error), 400)


@payment_bp.route("/billing/prepare", methods=["POST"])
@require_auth
@require_payment_origin
def prepare_billing_auth():
    try:
        return success_response(PaymentService.prepare_billing_auth(g.current_member.id))
    except (PaymentDisabledError, PaymentConfigurationError, ValueError) as error:
        return _payment_error(error)


@payment_bp.route("/billing/confirm", methods=["POST"])
@require_auth
@require_payment_origin
def confirm_billing_auth():
    payload = request.get_json(silent=True) or {}
    try:
        return success_response(PaymentService.confirm_billing_auth(
            g.current_member.id, payload.get("authKey"), payload.get("customerKey")
        ))
    except (PaymentDisabledError, PaymentConfigurationError, BillingKeyEncryptionError, PaymentVerificationError, TossPaymentsError, PermissionError, ValueError) as error:
        return _payment_error(error)


@payment_bp.route("/subscriptions/charge", methods=["POST"])
@require_auth
@require_payment_origin
def charge_initial_subscription():
    try:
        return success_response(PaymentService.charge_initial_subscription(g.current_member.id), status_code=201)
    except (
        PaymentDisabledError,
        PaymentConfigurationError,
        BillingKeyEncryptionError,
        PaymentVerificationError,
        TossPaymentsError,
        ValueError,
    ) as error:
        return _payment_error(error)


@payment_bp.route("/me", methods=["GET"])
@require_auth
def get_my_payments():
    return success_response(PaymentService.get_my_payments(g.current_member.id))


@payment_bp.route("/subscriptions/cancel", methods=["POST"])
@require_auth
@require_payment_origin
def cancel_subscription():
    try:
        return success_response(PaymentService.cancel_subscription(g.current_member.id))
    except (PaymentDisabledError, PaymentConfigurationError, ValueError) as error:
        return _payment_error(error)


@payment_bp.route("/webhooks/toss", methods=["POST"])
def toss_webhook():
    if not current_app.config.get("PAYMENT_ENABLED", False):
        return error_response("Payment feature is disabled", 503)
    # Toss documents a signature header only for payout/seller webhooks, not
    # PAYMENT_STATUS_CHANGED. Treat this payload as a notification and verify
    # payment facts through GET /v1/payments/{paymentKey} before updating DB.
    # https://docs.tosspayments.com/reference/using-api/webhook-events
    try:
        return success_response(PaymentService.process_webhook(request.get_json(silent=True) or {}, request.headers))
    except (PaymentDisabledError, PaymentConfigurationError, ValueError) as error:
        return _payment_error(error)
