from flask import Blueprint, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required

from app.services import AuthService
from app.utils.response import error_response, success_response

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/register", methods=["POST"])
def register():
    payload = request.get_json(silent=True) or {}

    try:
        result = AuthService.register(payload)
        return success_response(result, "Registration complete", 201)
    except ValueError as e:
        return error_response(str(e), 400)


@auth_bp.route("/login", methods=["POST"])
def login():
    payload = request.get_json(silent=True) or {}

    try:
        result = AuthService.login(payload)
        return success_response(result, "Login complete")
    except ValueError as e:
        return error_response(str(e), 401)


@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def me():
    try:
        member = AuthService.authenticate(get_jwt_identity())
        return success_response(member)
    except ValueError as e:
        return error_response(str(e), 401)


@auth_bp.route("/refresh", methods=["POST"])
@jwt_required(refresh=True)
def refresh():
    try:
        result = AuthService.refresh(
            get_jwt_identity(),
            provider=get_jwt().get("provider", "local"),
        )
        return success_response(result, "Access token refreshed")
    except ValueError as e:
        return error_response(str(e), 401)


@auth_bp.route("/logout", methods=["POST"])
@jwt_required()
def logout():
    result = AuthService.logout()
    return success_response(result, "Logout complete")


@auth_bp.route("/password-reset/request", methods=["POST"])
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


@auth_bp.route("/password-reset/confirm", methods=["POST"])
def reset_password():
    payload = request.get_json(silent=True) or {}

    try:
        result = AuthService.reset_password(payload)
        return success_response(result, "Password reset complete")
    except ValueError as e:
        return error_response(str(e), 400)


@auth_bp.route("/social-login", methods=["POST"])
def social_login():
    payload = request.get_json(silent=True) or {}

    try:
        result = AuthService.social_login(payload)
        return success_response(result, "Social login complete")
    except ValueError as e:
        return error_response(str(e), 400)
