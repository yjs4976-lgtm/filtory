from urllib.parse import urlencode, urlparse

from flask import Blueprint, current_app, redirect, request, url_for
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required

from app.services import AuthService
from app.utils.response import (
    auth_success_response,
    error_response,
    logout_success_response,
    set_auth_cookies,
    success_response,
)

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/register", methods=["POST"])
def register():
    payload = request.get_json(silent=True) or {}

    try:
        result = AuthService.register(payload)
        return auth_success_response(result, "Registration complete", 201)
    except ValueError as e:
        return error_response(str(e), 400)


@auth_bp.route("/login", methods=["POST"])
def login():
    payload = request.get_json(silent=True) or {}

    try:
        result = AuthService.login(payload)
        return auth_success_response(result, "Login complete")
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
        return auth_success_response(result, "Access token refreshed")
    except ValueError as e:
        return error_response(str(e), 401)


@auth_bp.route("/logout", methods=["POST"])
@jwt_required()
def logout():
    result = AuthService.logout()
    return logout_success_response(result, "Logout complete")


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
        return auth_success_response(result, "Social login complete")
    except ValueError as e:
        return error_response(str(e), 400)


@auth_bp.route("/social-login", methods=["GET"])
def start_social_login():
    provider = request.args.get("provider")
    frontend_redirect_uri = request.args.get("redirect_uri") or _default_frontend_callback_url()
    backend_redirect_uri = url_for("auth.social_login_callback", _external=True)

    try:
        authorization_url = AuthService.build_social_authorization_url(
            provider,
            backend_redirect_uri,
            frontend_redirect_uri,
        )
        return redirect(authorization_url)
    except ValueError as e:
        return redirect(_append_query(frontend_redirect_uri, {"error": str(e)}))


@auth_bp.route("/social-login/callback", methods=["GET"])
def social_login_callback():
    state = request.args.get("state")
    code = request.args.get("code")
    provider_error = request.args.get("error")
    fallback_redirect_uri = _default_frontend_callback_url()

    if provider_error:
        return redirect(_append_query(fallback_redirect_uri, {"error": provider_error}))

    try:
        result, frontend_redirect_uri = AuthService.complete_social_login(
            code,
            state,
            url_for("auth.social_login_callback", _external=True),
        )
        response = redirect(_append_query(frontend_redirect_uri, {"social_login": "success"}))
        set_auth_cookies(response, result.get("access_token"), result.get("refresh_token"))
        return response
    except ValueError as e:
        return redirect(_append_query(fallback_redirect_uri, {"error": str(e)}))


def _default_frontend_callback_url():
    frontend_base_url = current_app.config.get("FRONTEND_BASE_URL", "").rstrip("/")
    return f"{frontend_base_url}/auth/callback"


def _append_query(url, params):
    parsed = urlparse(url)
    separator = "&" if parsed.query else "?"
    return f"{url}{separator}{urlencode(params)}"
