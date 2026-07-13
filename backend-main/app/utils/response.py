from flask import jsonify
from flask_jwt_extended import set_access_cookies, set_refresh_cookies, unset_jwt_cookies


def success_response(data=None, message="success", status_code=200, meta=None):
    body = {
        "success": True,
        "message": message,
    }

    if data is not None:
        body["data"] = data

    if meta is not None:
        body["meta"] = meta

    return jsonify(body), status_code


def error_response(message="error", status_code=400, errors=None, data=None):
    body = {
        "success": False,
        "message": message,
    }

    if errors is not None:
        body["errors"] = errors

    if data is not None:
        body["data"] = data

    return jsonify(body), status_code


def auth_success_response(data=None, message="success", status_code=200):
    payload = dict(data or {})
    # 인증 토큰은 JSON 응답 본문에 넣지 않고 HttpOnly JWT 쿠키로만 내려보낸다.
    access_token = payload.pop("access_token", None)
    refresh_token = payload.pop("refresh_token", None)

    response, code = success_response(payload or None, message, status_code)
    set_auth_cookies(response, access_token, refresh_token)

    return response, code


def set_auth_cookies(response, access_token=None, refresh_token=None):
    if access_token:
        set_access_cookies(response, access_token)

    if refresh_token:
        set_refresh_cookies(response, refresh_token)

    return response


def logout_success_response(data=None, message="success", status_code=200):
    response, code = success_response(data, message, status_code)
    unset_jwt_cookies(response)
    return response, code
