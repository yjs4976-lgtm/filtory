def _isoformat(value):
    return value.isoformat() if value else None


MEMBER_FIELDS = {
    "email",
    "password_hash",
    "nickname",
    "real_name",
    "profile_img_url",
    "role",
    "active",
    "email_verified",
    "last_login_at",
    "password_changed_at",
    "deleted_at",
}


def member_to_dict(member, include_private=False):
    if member is None:
        return None

    data = {
        "id": member.id,
        "email": member.email,
        "nickname": member.nickname,
        "real_name": member.real_name,
        "profile_img_url": member.profile_img_url,
        "role": member.role,
        "active": member.active,
        "email_verified": member.email_verified,
        "last_login_at": _isoformat(member.last_login_at),
        "password_changed_at": _isoformat(member.password_changed_at),
        "deleted_at": _isoformat(member.deleted_at),
        "created_at": _isoformat(member.created_at),
        "updated_at": _isoformat(member.updated_at),
    }

    if include_private:
        data["password_hash"] = member.password_hash

    return data


def extract_member_data(payload, include_private=False):
    allowed_fields = MEMBER_FIELDS if include_private else MEMBER_FIELDS - {"password_hash"}
    return {
        key: payload[key]
        for key in allowed_fields
        if key in payload
    }
