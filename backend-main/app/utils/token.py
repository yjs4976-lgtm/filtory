from flask_jwt_extended import create_access_token, decode_token

AUTH_TOKEN_SALT = "filtory-auth-token"
PASSWORD_RESET_SALT = "filtory-password-reset"


def generate_token(payload, salt=AUTH_TOKEN_SALT):
    return create_access_token(
        identity=str(payload.get("member_id")),
        additional_claims={"provider": payload.get("provider", "local")},
    )


def verify_token(token, salt=AUTH_TOKEN_SALT, max_age=None):
    if not token:
        raise ValueError("Token is required")

    try:
        decoded = decode_token(token)
    except Exception as e:
        raise ValueError("Invalid token") from e

    return {
        "member_id": decoded.get("sub"),
        "provider": decoded.get("provider"),
    }


def generate_auth_token(member):
    return create_access_token(
        identity=str(member.id),
        additional_claims={"provider": "local"},
    )


def verify_auth_token(token):
    return verify_token(token)
