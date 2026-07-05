def _isoformat(value):
    return value.isoformat() if value else None


MEMBER_FIELDS = {
    "login_id",
    "email",
    "password_hash",
    "nickname",
    "real_name",
    "phone",
    "profile_img_url",
    "role",
    "status",
    "active",
    "email_verified",
    "last_login_at",
    "password_changed_at",
    "deleted_at",
}

MEMBER_FIELD_ALIASES = {
    "loginId": "login_id",
    "name": "real_name",
    "realName": "real_name",
    "phoneNumber": "phone",
    "profileImageUrl": "profile_img_url",
    "profileImageURL": "profile_img_url",
    "profile_image_url": "profile_img_url",
    "emailVerified": "email_verified",
    "lastLoginAt": "last_login_at",
    "passwordChangedAt": "password_changed_at",
    "deletedAt": "deleted_at",
}


def member_to_dict(member, include_private=False):
    if member is None:
        return None

    social_providers = {
        provider: False
        for provider in ("google", "naver", "kakao")
    }
    for account in getattr(member, "social_accounts", []) or []:
        provider = getattr(account, "provider", None)
        if provider in social_providers:
            social_providers[provider] = True

    data = {
        "id": member.id,
        "login_id": member.login_id,
        "email": member.email,
        "nickname": member.nickname,
        "real_name": member.real_name,
        "phone": member.phone,
        "profile_img_url": member.profile_img_url,
        "role": member.role,
        "status": member.status,
        "active": member.active,
        "email_verified": member.email_verified,
        "last_login_at": _isoformat(member.last_login_at),
        "password_changed_at": _isoformat(member.password_changed_at),
        "deleted_at": _isoformat(member.deleted_at),
        "created_at": _isoformat(member.created_at),
        "updated_at": _isoformat(member.updated_at),
        "hasPassword": bool(member.password_hash),
        "socialProviders": social_providers,
    }

    if include_private:
        data["password_hash"] = member.password_hash

    return data


def extract_member_data(payload, include_private=False):
    allowed_fields = MEMBER_FIELDS if include_private else MEMBER_FIELDS - {"password_hash"}
    data = {}

    for key in allowed_fields:
        if key in payload:
            data[key] = payload[key]

    for source_key, target_key in MEMBER_FIELD_ALIASES.items():
        if target_key in allowed_fields and source_key in payload:
            data[target_key] = payload[source_key]

    if "role" in data and isinstance(data["role"], str):
        data["role"] = data["role"].lower()

    if "phone" in data and data["phone"] is not None:
        digits = "".join(character for character in str(data["phone"]) if character.isdigit())
        data["phone"] = digits or None

    return data
