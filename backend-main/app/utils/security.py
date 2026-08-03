from functools import wraps

from urllib.parse import urlsplit

from flask import current_app, g, request
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
    # access token은 HttpOnly 쿠키 또는 Authorization 헤더에서 검증되고, 이후 DB의 활성 회원 상태까지 확인한다.
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
            # API 내부에서는 g.current_member만 믿고 member_id를 다시 클라이언트에서 받지 않도록 한다.
            g.current_member = get_current_member_from_request()
        except ValueError as e:
            return error_response(str(e), 401)

        return view_func(*args, **kwargs)

    return wrapper


def require_payment_origin(view_func):
    """쿠키 인증 결제 변경 요청에만 신뢰 가능한 Origin을 강제한다.

    브라우저가 자동 첨부하는 쿠키는 CSRF 대상이므로 Origin 검증이 필요하다.
    명시적 Bearer 토큰 요청은 브라우저가 자동 전송하지 않아 기존 API 호환성을
    유지한다. 전역 JWT 설정 대신 결제 변경 API에만 적용한다.
    """
    @wraps(view_func)
    def wrapper(*args, **kwargs):
        if get_bearer_token():
            return view_func(*args, **kwargs)

        origin = request.headers.get("Origin")
        allowed = current_app.config.get("CORS_ORIGINS", [])
        if isinstance(allowed, str):
            allowed = [item.strip() for item in allowed.split(",") if item.strip()]

        def normalized(value):
            parsed = urlsplit(str(value or ""))
            return f"{parsed.scheme.lower()}://{parsed.netloc.lower()}" if parsed.scheme and parsed.netloc else None

        if not origin or normalized(origin) not in {normalized(value) for value in allowed}:
            return error_response("Payment request origin is not allowed", 403)
        return view_func(*args, **kwargs)

    return wrapper


def require_admin(view_func):
    @wraps(view_func)
    def wrapper(*args, **kwargs):
        try:
            member = get_current_member_from_request()
        except ValueError as e:
            return error_response(str(e), 401)

        if str(member.role or "").lower() != "admin":
            return error_response("Admin permission is required", 403)

        # 관리자 전용 API도 현재 관리자 정보를 g.current_member에 넣어 감사/처리 로직에서 재사용한다.
        g.current_member = member
        return view_func(*args, **kwargs)

    return wrapper


def require_member_or_admin(view_func):
    @wraps(view_func)
    def wrapper(member_id, *args, **kwargs):
        try:
            member = get_current_member_from_request()
        except ValueError as e:
            return error_response(str(e), 401)

        if member.id != member_id and str(member.role or "").lower() != "admin":
            return error_response("Member permission is required", 403)

        # URL의 member_id가 본인이 아니면 관리자만 통과한다.
        g.current_member = member
        return view_func(member_id, *args, **kwargs)

    return wrapper
