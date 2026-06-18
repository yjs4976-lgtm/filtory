from datetime import datetime, timezone

from app.extensions import db
from app.repositories import MemberRepository
from app.schemas import member_to_dict
from app.services.mail_service import MailService
from app.services.member_service import MemberService
from app.services.social_auth_service import SocialAuthService
from app.services.token_service import TokenService
from app.utils.security import verify_password
from app.utils.validators import validate_email, validate_password, validate_required


class AuthService:
    @staticmethod
    def register(payload):
        validate_required(payload, ["email", "password"])
        validate_email(payload["email"])
        validate_password(payload["password"])

        member = MemberService.create_member(payload)
        member_model = MemberRepository.get_by_id(member["id"])

        return {
            "member": member,
            **TokenService.create_token_pair(member_model, provider="local", fresh=True),
        }

    @staticmethod
    def login(payload):
        validate_required(payload, ["email", "password"])
        validate_email(payload["email"])

        member = MemberRepository.get_by_email(payload["email"])

        if not member or not member.active or member.deleted_at:
            raise ValueError("Invalid email or password")

        if not verify_password(member.password_hash, payload["password"]):
            raise ValueError("Invalid email or password")

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
    def build_social_authorization_url(provider, backend_redirect_uri, frontend_redirect_uri):
        return SocialAuthService.build_authorization_url(
            provider,
            backend_redirect_uri,
            frontend_redirect_uri,
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

        return result, state_data["frontend_redirect_uri"]
