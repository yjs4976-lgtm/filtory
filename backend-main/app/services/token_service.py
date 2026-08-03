from flask_jwt_extended import create_access_token, create_refresh_token, get_jwt


class TokenService:
    """JWT access/refresh 쌍의 발급·회전·폐기 정책을 담당한다.

    토큰 원문은 서버에 저장하지 않고 JWT의 jti만 폐기 목록에 기록한다. 현재
    폐기 목록은 프로세스 메모리 기반이므로 다중 인스턴스 운영 전 공유 저장소로
    교체해야 한다는 제약을 호출부가 인지해야 한다.
    """

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
