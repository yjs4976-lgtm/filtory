from flask import Blueprint, request

from app.services import AuthService
from app.utils.response import auth_success_response, error_response

social_auth_bp = Blueprint("social_auth", __name__)


@social_auth_bp.route("/login", methods=["POST"])
def social_login():
    payload = request.get_json(silent=True) or {}

    try:
        result = AuthService.social_login(payload)
        return auth_success_response(result, "Social login complete")
    except ValueError as e:
        return error_response(str(e), 400)
