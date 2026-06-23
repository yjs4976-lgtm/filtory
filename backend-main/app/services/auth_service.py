from datetime import datetime, timezone

from flask import current_app

from app.extensions import db
from app.repositories import MemberRepository
from app.schemas import member_to_dict
from app.services.mail_service import MailService
from app.services.email_verification_service import EmailVerificationService
from app.services.member_service import MemberService
from app.services.social_auth_service import SocialAuthService
from app.services.token_service import TokenService
from app.utils.security import verify_password
from app.utils.validators import validate_email, validate_password, validate_required


class AuthService:
    @staticmethod
    def register(payload):
        login_id = payload.get("loginId") or payload.get("login_id")
        validate_required(
            {"login_id": login_id, "email": payload.get("email"), "password": payload.get("password")},
            ["login_id", "email", "password"],
        )
        validate_email(payload["email"])
        validate_password(payload["password"])

        if payload.get("termsAgreed") is not True or payload.get("privacyAgreed") is not True:
            raise ValueError("Required terms agreements are missing")

        signup_payload = {
            key: value
            for key, value in payload.items()
            if key not in {"passwordConfirm"}
        }
        signup_payload["login_id"] = login_id

        member = MemberService.create_member(signup_payload)
        member_model = MemberRepository.get_by_id(member["id"])

        return {
            "member": member,
            **TokenService.create_token_pair(member_model, provider="local", fresh=True),
        }

    @staticmethod
    def login(payload):
        identifier = payload.get("identifier") or payload.get("email")
        validate_required(
            {"identifier": identifier, "password": payload.get("password")},
            ["identifier", "password"],
        )

        member = MemberRepository.get_by_login_identifier(identifier)

        if not member or not member.active or member.deleted_at:
            raise ValueError("Invalid login ID, email, or password")

        if not verify_password(member.password_hash, payload["password"]):
            raise ValueError("Invalid login ID, email, or password")

        try:
            member.last_login_at = datetime.now(timezone.utc)
            db.session.commit()
        except Exception:
            db.session.rollback()
            raise

        return {
            "member": member_to_dict(member),
            **TokenService.create_token_pair(member, provider="local", fresh=True),
        }

    @staticmethod
    def authenticate(member_id):
        member = MemberRepository.get_by_id(int(member_id))

        if not member or not member.active or member.deleted_at:
            raise ValueError("Invalid member")

        return member_to_dict(member)

    @staticmethod
    def refresh(member_id, provider="local"):
        member = MemberRepository.get_by_id(int(member_id))

        if not member or not member.active or member.deleted_at:
            raise ValueError("Invalid member")

        return {
            "access_token": TokenService.create_access_token_for_identity(
                member.id,
                provider=provider,
                fresh=False,
            )
        }

    @staticmethod
    def logout():
        TokenService.revoke_current_token()
        return {"revoked": True}

    @staticmethod
    def request_password_reset(payload, request_ip=None, user_agent=None):
        result = MemberService.request_password_reset(payload, request_ip=request_ip, user_agent=user_agent)
        reset_token = result.pop("reset_token", None)

        if reset_token and payload.get("email"):
            result["mail"] = MailService.send_password_reset_email(payload["email"], reset_token)

        return result

    @staticmethod
    def reset_password(payload):
        validate_password(payload.get("password"))
        return MemberService.reset_password(payload)

    @staticmethod
    def request_email_verification(member_id, request_ip=None, user_agent=None):
        result = EmailVerificationService.request_verification(
            member_id,
            request_ip=request_ip,
            user_agent=user_agent,
        )
        verification_token = result.pop("verification_token", None)

        if verification_token and result.get("email"):
            try:
                result["mail"] = MailService.send_email_verification_email(
                    result["email"],
                    verification_token,
                )
                if not result["mail"].get("sent"):
                    current_app.logger.warning(
                        "Email verification was not sent: %s",
                        result["mail"].get("reason", "unknown_reason"),
                    )
            except Exception:
                current_app.logger.exception("Failed to send email verification message")
                result["mail"] = {"sent": False, "reason": "mail_delivery_failed"}

        result.pop("email", None)
        return result

    @staticmethod
    def confirm_email_verification(payload):
        return EmailVerificationService.confirm_verification(payload.get("token"))

    @staticmethod
    def social_login(payload):
        provider = payload.get("provider")
        access_token = payload.get("access_token")
        social_payload = SocialAuthService.verify_access_token(provider, access_token)
        return AuthService.social_login_with_user_info(social_payload)

    @staticmethod
    def social_login_with_user_info(social_payload):
        provider = social_payload.get("provider")
        member = MemberService.login_or_register_social(social_payload)
        member_model = MemberRepository.get_by_id(member["id"])

        return {
            "member": member,
            **TokenService.create_token_pair(member_model, provider=provider, fresh=True),
        }

    @staticmethod
    def build_social_authorization_url(provider, backend_redirect_uri, frontend_next_url):
        return SocialAuthService.build_authorization_url(
            provider,
            backend_redirect_uri,
            frontend_next_url,
        )

    @staticmethod
    def complete_social_login(code, state, backend_redirect_uri):
        if not code:
            raise ValueError("code is required")

        state_data = SocialAuthService.load_state(state)
        provider = state_data["provider"]
        social_payload = SocialAuthService.exchange_code_for_user_info(
            provider,
            code,
            backend_redirect_uri,
            state=state,
        )
        result = AuthService.social_login_with_user_info(social_payload)

        return result, state_data["frontend_next_url"]
