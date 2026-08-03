from flask_jwt_extended import create_access_token, create_refresh_token, get_jwt


class TokenService:
    # 개발 환경용 간단한 메모리 revoke 목록이다. 운영에서 다중 인스턴스를 쓰면 Redis 같은 공유 저장소가 필요하다.
    _revoked_jtis = set()

    @staticmethod
    def create_token_pair(member, provider="local", fresh=True):
        # fresh access token은 방금 로그인/소셜 인증을 마친 상태를 뜻한다.
        # 회원 탈퇴처럼 민감한 작업에서 일반 refresh access token과 구분해 사용한다.
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
