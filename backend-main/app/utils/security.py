from functools import wraps

from flask import g, request
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
from werkzeug.security import check_password_hash, generate_password_hash

from app.repositories import MemberRepository
from app.utils.response import error_response


def hash_password(password):
    return generate_password_hash(password)


def verify_password(password_hash, password):
    if not password_hash or not password:
        return False

    return check_password_hash(password_hash, password)


def get_bearer_token():
    auth_header = request.headers.get("Authorization", "")

    if not auth_header.startswith("Bearer "):
        return None

    return auth_header.removeprefix("Bearer ").strip()


def get_current_member_from_request():
    try:
        verify_jwt_in_request()
    except Exception as e:
        raise ValueError("Authorization token is required") from e

    member = MemberRepository.get_by_id(int(get_jwt_identity()))

    if not member or not member.active or member.deleted_at:
        raise ValueError("Invalid member")

    return member


def require_auth(view_func):
    @wraps(view_func)
    def wrapper(*args, **kwargs):
        try:
            g.current_member = get_current_member_from_request()
        except ValueError as e:
            return error_response(str(e), 401)

        return view_func(*args, **kwargs)

    return wrapper


def require_admin(view_func):
    @wraps(view_func)
    def wrapper(*args, **kwargs):
        try:
            member = get_current_member_from_request()
        except ValueError as e:
            return error_response(str(e), 401)

        if member.role != "admin":
            return error_response("Admin permission is required", 403)

        g.current_member = member
        return view_func(*args, **kwargs)

    return wrapper
