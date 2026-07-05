import hashlib
import re
import secrets
from datetime import datetime, timedelta, timezone

from app.extensions import db
from app.models import Member
from app.repositories import MemberRepository
from app.schemas import extract_member_data, member_to_dict
from app.utils.security import hash_password, verify_password
from app.utils.validators import validate_email, validate_password


class MemberService:
    SOCIAL_PROVIDERS = {"kakao", "naver", "google"}
    PROFILE_FIELDS = {"email", "nickname", "real_name", "phone", "profile_img_url"}
    PROFILE_PASSWORD_FIELDS = {
        "password",
        "password_hash",
        "passwordHash",
        "currentPassword",
        "current_password",
        "newPassword",
        "new_password",
    }
    CREATE_FIELDS = PROFILE_FIELDS | {"login_id"}
    TERMS_PAYLOAD_MAP = {
        "termsAgreed": "terms",
        "privacyAgreed": "privacy",
        "marketingAgreed": "marketing",
    }

    @staticmethod
    def get_member(member_id):
        member = MemberRepository.get_by_id(member_id)
        if not member:
            raise ValueError("Member not found")
        return member_to_dict(member)

    @staticmethod
    def list_active_members(limit=20, offset=0):
        members = MemberRepository.list_active(limit=limit, offset=offset)
        return [member_to_dict(member) for member in members]

    @staticmethod
    def create_member(payload):
        data = extract_member_data(payload, include_private=False)
        data = {key: value for key, value in data.items() if key in MemberService.CREATE_FIELDS}
        _normalize_member_data(data)

        if payload.get("password"):
            data["password_hash"] = hash_password(payload["password"])

        if data.get("email"):
            validate_email(data["email"])

        if data.get("email") and MemberRepository.get_by_email(data["email"]):
            raise ValueError("Email already exists")

        MemberService._validate_login_id(data.get("login_id"))
        if not data.get("nickname") and data.get("login_id"):
            data["nickname"] = data["login_id"]
        MemberService._validate_nickname(data.get("nickname"))

        try:
            member = MemberRepository.create(data)
            db.session.flush()
            MemberService._create_terms_agreements(member.id, payload)
            db.session.commit()
            return member_to_dict(member)
        except Exception as e:
            db.session.rollback()
            raise ValueError("Failed to create member") from e

    @staticmethod
    def update_member(member_id, payload):
        member = MemberRepository.get_by_id(member_id)
        if not member:
            raise ValueError("Member not found")

        payload = dict(payload or {})
        if any(key in payload and payload.get(key) not in (None, "") for key in MemberService.PROFILE_PASSWORD_FIELDS):
            raise ValueError("Use the password change endpoint")

        data = extract_member_data(payload)
        data = {key: value for key, value in data.items() if key in MemberService.PROFILE_FIELDS}
        _normalize_member_data(data)

        if "email" in data:
            email = (data["email"] or "").strip().lower()
            if not email:
                data["email"] = None
            else:
                validate_email(email)
                existing_member = MemberRepository.get_by_email(email)
                if existing_member and existing_member.id != member.id:
                    raise ValueError("Email already exists")
                data["email"] = email
                if email != member.email:
                    data["email_verified"] = False

        if "nickname" in data:
            MemberService._validate_nickname(data["nickname"], member_id=member.id)

        try:
            member = MemberRepository.update(member, data)
            db.session.commit()
            return member_to_dict(member)
        except Exception:
            db.session.rollback()
            raise

    @staticmethod
    def change_password(member_id, current_password, new_password):
        member = MemberRepository.get_by_id(member_id)
        if not member or not member.active or member.deleted_at:
            raise ValueError("Member not found")

        _validate_current_password(member, current_password)
        validate_password(new_password)

        try:
            member.password_hash = hash_password(new_password)
            member.password_changed_at = datetime.now(timezone.utc)
            db.session.commit()
            return {"changed": True}
        except Exception:
            db.session.rollback()
            raise

    @staticmethod
    def deactivate_member(member_id, password=None, requester=None, fresh_auth=False):
        member = MemberRepository.get_by_id(member_id)
        if not member:
            raise ValueError("Member not found")

        requester_is_admin = str(getattr(requester, "role", "") or "").lower() == "admin"
        if not requester_is_admin:
            if member.password_hash:
                _validate_current_password(member, password)
            elif not _has_social_account(member) or not fresh_auth:
                raise ValueError("Fresh account verification is required")

        try:
            _release_member_identity_for_rejoin(member)
            member = MemberRepository.update(
                member,
                {
                    "active": False,
                    "status": "withdrawn",
                    "deleted_at": datetime.now(timezone.utc),
                },
            )
            db.session.commit()
            return member_to_dict(member)
        except Exception:
            db.session.rollback()
            raise

    @staticmethod
    def find_member_emails(payload):
        real_name = payload.get("real_name") or payload.get("name") or payload.get("realName")
        phone = _normalize_phone(payload.get("phone"))

        query = Member.query.filter(Member.active.is_(True), Member.deleted_at.is_(None))

        if not real_name or not phone:
            raise ValueError("real_name and phone are required")

        query = query.filter(Member.real_name == real_name, Member.phone == phone)

        members = query.order_by(Member.created_at.desc()).all()

        return [
            {
                "id": member.id,
                "email": _mask_email(member.email),
                "created_at": member.created_at.isoformat() if member.created_at else None,
            }
            for member in members
            if member.email
        ]

    @staticmethod
    def find_member_id(payload):
        real_name = (payload.get("real_name") or payload.get("name") or "").strip()
        phone = _normalize_phone(payload.get("phone"))

        if not real_name or not phone:
            raise ValueError("name and phone are required")

        member = MemberRepository.get_active_by_name_and_phone(real_name, phone)
        if not member or not member.login_id:
            raise ValueError("No matching member found")

        return {"id": _mask_login_id(member.login_id)}

    @staticmethod
    def check_nickname_available(nickname):
        normalized_nickname = _normalize_nickname(nickname)
        if not normalized_nickname or len(normalized_nickname) < 2:
            return {"available": False}
        return {"available": MemberRepository.get_by_nickname(normalized_nickname) is None}

    @staticmethod
    def check_login_id_available(login_id):
        normalized_login_id = _normalize_login_id(login_id)
        if not _is_valid_login_id(normalized_login_id):
            return {"available": False}
        return {"available": MemberRepository.get_by_login_id(normalized_login_id) is None}

    @staticmethod
    def request_password_reset(payload, request_ip=None, user_agent=None):
        email = _normalize_email(payload.get("email"))
        if not email:
            raise ValueError("email is required")

        member = MemberRepository.get_by_email(email)
        if not member or not member.active or member.deleted_at:
            return {"requested": True}

        raw_token = secrets.token_urlsafe(32)
        token_hash = _hash_token(raw_token)

        try:
            MemberRepository.create_password_reset_token(
                {
                    "member_id": member.id,
                    "token_hash": token_hash,
                    "expires_at": datetime.now(timezone.utc) + timedelta(minutes=30),
                    "request_ip": request_ip,
                    "user_agent": user_agent,
                }
            )
            db.session.commit()
            return {
                "requested": True,
                "reset_token": raw_token,
            }
        except Exception:
            db.session.rollback()
            raise

    @staticmethod
    def reset_password(payload):
        raw_token = payload.get("token")
        password = payload.get("password")

        if not raw_token or not password:
            raise ValueError("token and password are required")

        token = MemberRepository.get_password_reset_token(_hash_token(raw_token))
        now = datetime.now(timezone.utc)

        if not token or token.used_at or _as_aware_datetime(token.expires_at) < now:
            raise ValueError("Invalid or expired token")

        member = MemberRepository.get_by_id(token.member_id)
        if not member or not member.active or member.deleted_at:
            raise ValueError("Member not found")

        try:
            member.password_hash = hash_password(password)
            member.password_changed_at = now
            token.used_at = now
            db.session.commit()
            return {"reset": True}
        except Exception:
            db.session.rollback()
            raise

    @staticmethod
    def login_or_register_social(payload):
        provider = payload.get("provider")
        social_id = payload.get("social_id")

        if provider not in MemberService.SOCIAL_PROVIDERS:
            raise ValueError("Invalid social provider")

        if not social_id:
            raise ValueError("social_id is required")

        try:
            social_account = MemberRepository.get_social_account(provider, social_id)
            if social_account:
                if social_account.member.active and not social_account.member.deleted_at:
                    MemberService._fill_missing_social_profile(social_account.member, payload)
                    return member_to_dict(social_account.member)

                _release_member_identity_for_rejoin(social_account.member)
                db.session.flush()

            social_email = _normalize_email(payload.get("social_email"))
            member = MemberRepository.get_by_email(social_email) if social_email else None

            if member and (not member.active or member.deleted_at):
                _release_member_identity_for_rejoin(member)
                db.session.flush()
                member = None

            if not member:
                member = MemberRepository.create(
                    {
                        "email": social_email,
                        "nickname": MemberService._get_available_social_nickname(
                            payload.get("social_nickname"),
                            social_id,
                        ),
                        "profile_img_url": payload.get("profile_img_url"),
                        "email_verified": bool(payload.get("email_verified")),
                    }
                )
                db.session.flush()
            else:
                MemberService._fill_missing_social_profile(member, payload, commit=False)

            MemberRepository.create_social_account(
                {
                    "member_id": member.id,
                    "provider": provider,
                    "social_id": social_id,
                    "social_email": social_email,
                    "social_nickname": payload.get("social_nickname"),
                    "profile_img_url": payload.get("profile_img_url"),
                }
            )
            db.session.commit()
            return member_to_dict(member)
        except Exception:
            db.session.rollback()
            raise

    @staticmethod
    def _fill_missing_social_profile(member, payload, commit=True):
        changed = False

        if not member.nickname and payload.get("social_nickname"):
            member.nickname = MemberService._get_available_social_nickname(
                payload["social_nickname"],
                payload.get("social_id"),
            )
            changed = True

        if not member.profile_img_url and payload.get("profile_img_url"):
            member.profile_img_url = payload["profile_img_url"]
            changed = True

        social_email = _normalize_email(payload.get("social_email"))
        if not member.email and social_email:
            member.email = social_email
            member.email_verified = bool(payload.get("email_verified"))
            changed = True

        if changed and commit:
            try:
                db.session.commit()
            except Exception:
                db.session.rollback()
                raise

    @staticmethod
    def _create_terms_agreements(member_id, payload):
        for payload_key, agreement_type in MemberService.TERMS_PAYLOAD_MAP.items():
            if payload_key != "marketingAgreed" and payload.get(payload_key) is not True:
                continue

            MemberRepository.create_terms_agreement(
                {
                    "member_id": member_id,
                    "agreement_type": agreement_type,
                    "agreed": payload.get(payload_key) is True,
                }
            )

    @staticmethod
    def _validate_nickname(nickname, member_id=None):
        if nickname is None:
            return

        normalized_nickname = _normalize_nickname(nickname)
        if not normalized_nickname:
            raise ValueError("nickname cannot be empty")

        existing_member = MemberRepository.get_by_nickname(normalized_nickname)
        if existing_member and existing_member.id != member_id:
            raise ValueError("Nickname already exists")

    @staticmethod
    def _validate_login_id(login_id):
        normalized_login_id = _normalize_login_id(login_id)
        if not normalized_login_id:
            raise ValueError("login_id is required")
        if not _is_valid_login_id(normalized_login_id):
            raise ValueError("login_id must be 4-20 letters, numbers, _, -, or .")
        if MemberRepository.get_by_login_id(normalized_login_id):
            raise ValueError("Login ID already exists")

    @staticmethod
    def _get_available_social_nickname(nickname, social_id):
        base_nickname = str(nickname or "").strip()
        if not base_nickname:
            return None

        if not MemberRepository.get_by_nickname(_normalize_nickname(base_nickname)):
            return base_nickname

        suffix = str(social_id or "social")[-8:]
        candidate = f"{base_nickname[:90]}-{suffix}"
        sequence = 2

        while MemberRepository.get_by_nickname(_normalize_nickname(candidate)):
            suffix_with_sequence = f"-{suffix}-{sequence}"
            candidate = f"{base_nickname[:100 - len(suffix_with_sequence)]}{suffix_with_sequence}"
            sequence += 1

        return candidate


def _hash_token(raw_token):
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def _as_aware_datetime(value):
    if value.tzinfo:
        return value

    return value.replace(tzinfo=timezone.utc)


def _mask_email(email):
    if not email or "@" not in email:
        return email

    local_part, domain = email.split("@", 1)
    if len(local_part) <= 2:
        masked_local = local_part[0] + "*"
    else:
        masked_local = local_part[:2] + "*" * (len(local_part) - 2)

    return f"{masked_local}@{domain}"


def _normalize_member_data(data):
    if "email" in data and data["email"] is not None:
        data["email"] = _normalize_email(data["email"])
    if "login_id" in data and data["login_id"] is not None:
        data["login_id"] = _normalize_login_id(data["login_id"])
    if "phone" in data:
        data["phone"] = _normalize_phone(data["phone"])
    if "nickname" in data and data["nickname"] is not None:
        data["nickname"] = data["nickname"].strip()


def _normalize_phone(value):
    if value is None:
        return None

    digits = "".join(char for char in str(value) if char.isdigit())
    return digits or None


def _normalize_nickname(value):
    return str(value or "").strip().lower()


def _normalize_login_id(value):
    return str(value or "").strip().lower()


def _normalize_email(value):
    return str(value or "").strip().lower()


def _is_valid_login_id(value):
    return bool(re.fullmatch(r"[a-z0-9_.-]{4,20}", value or ""))


def _mask_login_id(login_id):
    if len(login_id) <= 2:
        return "*" * len(login_id)
    visible_length = min(3, len(login_id) - 1)
    return f"{login_id[:visible_length]}{'*' * (len(login_id) - visible_length)}"


def _has_social_account(member):
    return bool(getattr(member, "social_accounts", None))


def _release_member_identity_for_rejoin(member):
    member.email = None
    member.login_id = None
    member.nickname = None
    member.real_name = None
    member.phone = None
    member.profile_img_url = None
    member.email_verified = False

    social_accounts = list(getattr(member, "social_accounts", []) or [])
    delete = getattr(db.session, "delete", None)
    for account in social_accounts:
        if callable(delete):
            delete(account)

    if hasattr(member, "social_accounts"):
        member.social_accounts = []


def _validate_current_password(member, password):
    if not member.password_hash:
        raise ValueError("Password change is unavailable for social login accounts")
    if not password:
        raise ValueError("Current password is required")
    if not member.password_hash or not verify_password(member.password_hash, password):
        raise ValueError("Current password is invalid")
