from flask_jwt_extended import create_access_token, create_refresh_token, get_jwt


class TokenService:
    _revoked_jtis = set()

    @staticmethod
    def create_token_pair(member, provider="local", fresh=True):
        identity = str(member.id)
        claims = {
            "provider": provider,
        }

        return {
            "access_token": create_access_token(
                identity=identity,
                additional_claims=claims,
                fresh=fresh,
            ),
            "refresh_token": create_refresh_token(
                identity=identity,
                additional_claims=claims,
            ),
        }

    @staticmethod
    def create_access_token_for_identity(identity, provider="local", fresh=False):
        return create_access_token(
            identity=str(identity),
            additional_claims={"provider": provider},
            fresh=fresh,
        )

    @staticmethod
    def revoke_current_token():
        jwt_payload = get_jwt()
        TokenService.revoke_jti(jwt_payload["jti"])

    @staticmethod
    def revoke_jti(jti):
        TokenService._revoked_jtis.add(jti)

    @staticmethod
    def is_token_revoked(jti):
        return jti in TokenService._revoked_jtis
