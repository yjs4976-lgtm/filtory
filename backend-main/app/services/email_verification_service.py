import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from app.extensions import db
from app.repositories import MemberRepository
from app.schemas import member_to_dict


class EmailVerificationService:
    """이메일 인증 코드의 발급·만료·일회성 사용 정책을 관리한다.

    코드 원문 노출을 최소화하고, 이미 사용했거나 만료된 토큰은 회원 상태 변경의
    근거로 재사용하지 않는다.
    """

    @staticmethod
    def request_verification(member_id, request_ip=None, user_agent=None):
        member = MemberRepository.get_by_id(member_id)
        if not member or not member.active or member.deleted_at:
            raise ValueError("Member not found")
        if not member.email:
            raise ValueError("Email address is required before verification")
        if member.email_verified:
            return {"requested": False, "already_verified": True}

        raw_token = secrets.token_urlsafe(32)

        try:
            MemberRepository.create_email_verification_token(
                {
                    "member_id": member.id,
                    "token_hash": _hash_token(raw_token),
                    "expires_at": datetime.now(timezone.utc) + timedelta(minutes=30),
                    "request_ip": request_ip,
                    "user_agent": user_agent,
                }
            )
            db.session.commit()
            return {"requested": True, "verification_token": raw_token, "email": member.email}
        except Exception:
            db.session.rollback()
            raise

    @staticmethod
    def confirm_verification(raw_token):
        if not raw_token:
            raise ValueError("token is required")

        token = MemberRepository.get_email_verification_token(_hash_token(raw_token))
        now = datetime.now(timezone.utc)

        if not token or token.used_at or _as_aware_datetime(token.expires_at) < now:
            raise ValueError("Invalid or expired verification token")

        member = MemberRepository.get_by_id(token.member_id)
        if not member or not member.active or member.deleted_at or not member.email:
            raise ValueError("Member not found")

        try:
            token.used_at = now
            member.email_verified = True
            db.session.commit()
            return member_to_dict(member)
        except Exception:
            db.session.rollback()
            raise


def _hash_token(raw_token):
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def _as_aware_datetime(value):
    return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
