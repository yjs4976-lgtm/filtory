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


@auth_bp.route("/email-verification/resend", methods=["POST"])
@jwt_required()
def resend_email_verification():
    try:
        result = AuthService.request_email_verification(
            get_jwt_identity(),
            request_ip=request.remote_addr,
            user_agent=request.headers.get("User-Agent"),
        )
        return success_response(result, "Email verification requested")
    except ValueError as e:
        return error_response(str(e), 400)


@auth_bp.route("/email-verification/confirm", methods=["POST"])
def confirm_email_verification():
    payload = request.get_json(silent=True) or {}

    try:
        member = AuthService.confirm_email_verification(payload)
        return success_response(member, "Email verification complete")
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
    frontend_next_url = (
        request.args.get("next")
        or request.args.get("redirect_uri")
        or _default_frontend_callback_url()
    )

    try:
        backend_redirect_uri = _provider_backend_redirect_uri(provider)
        authorization_url = AuthService.build_social_authorization_url(
            provider,
            backend_redirect_uri,
            frontend_next_url,
        )
        return redirect(authorization_url)
    except ValueError as e:
        return redirect(_append_query(frontend_next_url, {"error": str(e)}))


@auth_bp.route("/social-login/callback", methods=["GET"])
def social_login_callback():
    return _complete_social_login_callback(
        url_for("auth.social_login_callback", _external=True)
    )


@auth_bp.route("/<provider>/callback", methods=["GET"])
def provider_social_login_callback(provider):
    try:
        backend_redirect_uri = _provider_backend_redirect_uri(provider)
    except ValueError as e:
        return redirect(_append_query(_default_frontend_callback_url(), {"error": str(e)}))

    return _complete_social_login_callback(backend_redirect_uri)


def _complete_social_login_callback(backend_redirect_uri):
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
            backend_redirect_uri,
        )
        response = redirect(_append_query(frontend_redirect_uri, {"social_login": "success"}))
        set_auth_cookies(response, result.get("access_token"), result.get("refresh_token"))
        return response
    except ValueError as e:
        return redirect(_append_query(fallback_redirect_uri, {"error": str(e)}))


def _default_frontend_callback_url():
    return current_app.config.get("FRONTEND_CALLBACK_URL")


def _provider_backend_redirect_uri(provider):
    if not provider:
        raise ValueError("provider is required")

    configured_redirect_uri = current_app.config.get(f"{provider.upper()}_REDIRECT_URI")
    if configured_redirect_uri:
        return configured_redirect_uri

    return url_for("auth.provider_social_login_callback", provider=provider, _external=True)


def _append_query(url, params):
    parsed = urlparse(url)
    separator = "&" if parsed.query else "?"
    return f"{url}{separator}{urlencode(params)}"
