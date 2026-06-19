from flask import Blueprint, request

from app.services import AuthService
from app.services import MemberService
from app.utils.pagination import build_pagination_meta, get_pagination_params
from app.utils.response import auth_success_response, error_response, success_response

member_bp = Blueprint("members", __name__)


@member_bp.route("/", methods=["GET"])
def list_members():
    pagination = get_pagination_params(request.args)
    members = MemberService.list_active_members(
        limit=pagination["limit"],
        offset=pagination["offset"],
    )

    return success_response(
        data=members,
        meta=build_pagination_meta(pagination["page"], pagination["per_page"], len(members)),
    )


@member_bp.route("/", methods=["POST"])
def create_member():
    payload = request.get_json(silent=True) or {}

    try:
        member = MemberService.create_member(payload)
        return success_response(member, "Member created", 201)
    except ValueError as e:
        return error_response(str(e), 400)


@member_bp.route("/<int:member_id>", methods=["GET"])
def get_member(member_id):
    try:
        member = MemberService.get_member(member_id)
        return success_response(member)
    except ValueError as e:
        return error_response(str(e), 404)


@member_bp.route("/<int:member_id>", methods=["PATCH"])
def update_member(member_id):
    payload = request.get_json(silent=True) or {}

    try:
        member = MemberService.update_member(member_id, payload)
        return success_response(member, "Member updated")
    except ValueError as e:
        return error_response(str(e), 400)


@member_bp.route("/<int:member_id>", methods=["DELETE"])
def deactivate_member(member_id):
    try:
        member = MemberService.deactivate_member(member_id)
        return success_response(member, "Member deactivated")
    except ValueError as e:
        return error_response(str(e), 404)


@member_bp.route("/find-email", methods=["POST"])
def find_member_emails():
    payload = request.get_json(silent=True) or {}

    try:
        emails = MemberService.find_member_emails(payload)
        return success_response(emails)
    except ValueError as e:
        return error_response(str(e), 400)


@member_bp.route("/find-id", methods=["POST"])
def find_member_id():
    payload = request.get_json(silent=True) or {}

    try:
        return success_response(MemberService.find_member_id(payload))
    except ValueError as e:
        return error_response(str(e), 400)


@member_bp.route("/password-reset/request", methods=["POST"])
def request_password_reset():
    payload = request.get_json(silent=True) or {}

    try:
        result = AuthService.request_password_reset(
            payload,
            request_ip=request.remote_addr,
            user_agent=request.headers.get("User-Agent"),
        )
        return success_response(result, "Password reset requested")
    except ValueError as e:
        return error_response(str(e), 400)


@member_bp.route("/password-reset/confirm", methods=["POST"])
def reset_password():
    payload = request.get_json(silent=True) or {}

    try:
        result = MemberService.reset_password(payload)
        return success_response(result, "Password reset complete")
    except ValueError as e:
        return error_response(str(e), 400)


@member_bp.route("/social-login", methods=["POST"])
def social_login():
    payload = request.get_json(silent=True) or {}

    try:
        result = AuthService.social_login(payload)
        return auth_success_response(result, "Social login complete")
    except ValueError as e:
        return error_response(str(e), 400)
