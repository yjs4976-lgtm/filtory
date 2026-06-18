from app.clients.google_oauth_client import GoogleOAuthClient
from app.clients.kakao_oauth_client import KakaoOAuthClient
from app.clients.naver_oauth_client import NaverOAuthClient


class SocialAuthService:
    CLIENTS = {
        "google": GoogleOAuthClient,
        "kakao": KakaoOAuthClient,
        "naver": NaverOAuthClient,
    }

    @staticmethod
    def verify_access_token(provider, access_token):
        if provider not in SocialAuthService.CLIENTS:
            raise ValueError("Invalid social provider")

        if not access_token:
            raise ValueError("access_token is required")

        user_info = SocialAuthService.CLIENTS[provider].get_user_info(access_token)

        if not user_info.get("social_id"):
            raise ValueError("Social account id is required")

        return user_info
