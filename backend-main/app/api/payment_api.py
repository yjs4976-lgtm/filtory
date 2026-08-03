import base64
import hashlib
import hmac

from flask import Blueprint, current_app, g, request

from app.clients.toss_payments_client import TossPaymentsError
from app.services.payment_service import PaymentConfigurationError, PaymentDisabledError, PaymentService
from app.utils.crypto import BillingKeyEncryptionError
from app.utils.response import error_response, success_response
from app.utils.security import require_auth

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
    return error_response(str(error), 400)


@payment_bp.route("/billing/prepare", methods=["POST"])
@require_auth
def prepare_billing_auth():
    try:
        return success_response(PaymentService.prepare_billing_auth(g.current_member.id))
    except (PaymentDisabledError, PaymentConfigurationError, ValueError) as error:
        return _payment_error(error)


@payment_bp.route("/billing/confirm", methods=["POST"])
@require_auth
def confirm_billing_auth():
    payload = request.get_json(silent=True) or {}
    try:
        return success_response(PaymentService.confirm_billing_auth(
            g.current_member.id, payload.get("authKey"), payload.get("customerKey")
        ))
    except (PaymentDisabledError, PaymentConfigurationError, BillingKeyEncryptionError, TossPaymentsError, PermissionError, ValueError) as error:
        return _payment_error(error)


@payment_bp.route("/subscriptions/charge", methods=["POST"])
@require_auth
def charge_initial_subscription():
    try:
        return success_response(PaymentService.charge_initial_subscription(g.current_member.id), status_code=201)
    except (PaymentDisabledError, PaymentConfigurationError, BillingKeyEncryptionError, TossPaymentsError, ValueError) as error:
        return _payment_error(error)


@payment_bp.route("/me", methods=["GET"])
@require_auth
def get_my_payments():
    return success_response(PaymentService.get_my_payments(g.current_member.id))


@payment_bp.route("/subscriptions/cancel", methods=["POST"])
@require_auth
def cancel_subscription():
    try:
        return success_response(PaymentService.cancel_subscription(g.current_member.id))
    except (PaymentDisabledError, PaymentConfigurationError, ValueError) as error:
        return _payment_error(error)


@payment_bp.route("/webhooks/toss", methods=["POST"])
def toss_webhook():
    if not current_app.config.get("PAYMENT_ENABLED", False):
        return error_response("Payment feature is disabled", 503)
    raw_body = request.get_data(cache=True)
    if not _valid_webhook_signature(raw_body, request.headers.get("X-Toss-Signature")):
        return error_response("Invalid webhook signature", 401)
    try:
        return success_response(PaymentService.process_webhook(request.get_json(silent=True) or {}, request.headers))
    except (PaymentDisabledError, PaymentConfigurationError, ValueError) as error:
        return _payment_error(error)


def _valid_webhook_signature(raw_body, supplied_signature):
    secret = current_app.config.get("TOSS_WEBHOOK_SECRET")
    if not secret or not supplied_signature:
        return False
    digest = hmac.new(str(secret).encode("utf-8"), raw_body, hashlib.sha256).digest()
    candidates = {digest.hex(), base64.b64encode(digest).decode("ascii")}
    return any(hmac.compare_digest(str(supplied_signature), candidate) for candidate in candidates)
