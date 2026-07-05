from urllib.parse import urlparse

from flask import current_app
from itsdangerous import BadSignature, URLSafeSerializer

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

    @staticmethod
    def build_authorization_url(provider, backend_redirect_uri, frontend_next_url):
        client = SocialAuthService._get_client(provider)
        client_id = SocialAuthService._get_client_config(provider, "CLIENT_ID")
        safe_frontend_next_url = SocialAuthService.sanitize_frontend_next_url(frontend_next_url)

        state = _get_state_serializer().dumps(
            {
                "provider": provider,
                "frontend_next_url": safe_frontend_next_url,
            }
        )

        return client.get_authorization_url(client_id, backend_redirect_uri, state)

    @staticmethod
    def exchange_code_for_user_info(provider, code, backend_redirect_uri, state=None):
        client = SocialAuthService._get_client(provider)
        client_id = SocialAuthService._get_client_config(provider, "CLIENT_ID")
        client_secret = current_app.config.get(f"{provider.upper()}_CLIENT_SECRET")
        access_token = client.exchange_code_for_access_token(
            code,
            backend_redirect_uri,
            client_id,
            client_secret=client_secret,
            state=state,
        )

        if not access_token:
            raise ValueError("Failed to get social access token")

        return SocialAuthService.verify_access_token(provider, access_token)

    @staticmethod
    def load_state(state):
        if not state:
            raise ValueError("state is required")

        try:
            data = _get_state_serializer().loads(state)
        except BadSignature as e:
            raise ValueError("Invalid social login state") from e

        provider = data.get("provider")
        if provider not in SocialAuthService.CLIENTS:
            raise ValueError("Invalid social provider")

        if data.get("frontend_redirect_uri") and not data.get("frontend_next_url"):
            data["frontend_next_url"] = data["frontend_redirect_uri"]
        data["frontend_next_url"] = SocialAuthService.sanitize_frontend_next_url(
            data.get("frontend_next_url")
        )

        return data

    @staticmethod
    def sanitize_frontend_next_url(url):
        fallback = current_app.config.get("FRONTEND_CALLBACK_URL") or current_app.config.get("FRONTEND_BASE_URL")
        if not url:
            return fallback

        try:
            parsed = urlparse(url)
        except ValueError:
            return fallback

        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            return fallback

        if _url_origin(url) in _allowed_frontend_origins():
            return url

        return fallback

    @staticmethod
    def _get_client(provider):
        if provider not in SocialAuthService.CLIENTS:
            raise ValueError("Invalid social provider")

        return SocialAuthService.CLIENTS[provider]

    @staticmethod
    def _get_client_config(provider, key):
        value = current_app.config.get(f"{provider.upper()}_{key}")

        if not value:
            raise ValueError(f"{provider.upper()}_{key} is not configured")

        return value


def _get_state_serializer():
    return URLSafeSerializer(current_app.config["JWT_SECRET_KEY"], salt="social-oauth-state")


def _url_origin(url):
    parsed = urlparse(url)
    return f"{parsed.scheme}://{parsed.netloc}".rstrip("/")


def _allowed_frontend_origins():
    origins = set()
    for value in [
        current_app.config.get("FRONTEND_BASE_URL"),
        current_app.config.get("FRONTEND_CALLBACK_URL"),
        *(current_app.config.get("CORS_ORIGINS") or []),
    ]:
        if not value:
            continue
        try:
            parsed = urlparse(value)
        except ValueError:
            continue
        if parsed.scheme in {"http", "https"} and parsed.netloc:
            origins.add(f"{parsed.scheme}://{parsed.netloc}".rstrip("/"))
    return origins
