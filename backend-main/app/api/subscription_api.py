from flask import Blueprint, request

from app.services import SubscriptionService
from app.utils.response import error_response, success_response
from app.utils.security import require_admin, require_member_or_admin

subscription_bp = Blueprint("subscriptions", __name__)


@subscription_bp.route("/plans", methods=["GET"])
def list_subscription_plans():
    plans = SubscriptionService.list_active_plans()
    return success_response(plans)


@subscription_bp.route("/members/<int:member_id>/current", methods=["GET"])
@require_member_or_admin
def get_current_member_subscription(member_id):
    try:
        subscription = SubscriptionService.get_current_member_subscription(member_id)
        return success_response(subscription)
    except ValueError as e:
        return error_response(str(e), 404)


@subscription_bp.route("/members", methods=["POST"])
@require_admin
def create_member_subscription():
    payload = request.get_json(silent=True) or {}

    try:
        subscription = SubscriptionService.create_member_subscription(payload)
        return success_response(subscription, "Member subscription created", 201)
    except ValueError as e:
        return error_response(str(e), 400)


@subscription_bp.route("/members/<int:subscription_id>", methods=["PATCH"])
@require_admin
def update_member_subscription(subscription_id):
    payload = request.get_json(silent=True) or {}

    try:
        subscription = SubscriptionService.update_member_subscription(subscription_id, payload)
        return success_response(subscription, "Member subscription updated")
    except ValueError as e:
        return error_response(str(e), 400)
