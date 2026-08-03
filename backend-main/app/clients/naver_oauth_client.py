import json
from urllib.parse import urlencode
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


class NaverOAuthClient:
    """Naver OAuth 토큰·프로필 API의 제공자별 응답 구조를 캡슐화한다."""

    AUTHORIZE_URL = "https://nid.naver.com/oauth2.0/authorize"
    TOKEN_URL = "https://nid.naver.com/oauth2.0/token"
    USER_INFO_URL = "https://openapi.naver.com/v1/nid/me"

    @staticmethod
    def get_authorization_url(client_id, redirect_uri, state):
        query = urlencode(
            {
                "client_id": client_id,
                "redirect_uri": redirect_uri,
                "response_type": "code",
                "state": state,
            }
        )
        return f"{NaverOAuthClient.AUTHORIZE_URL}?{query}"

    @staticmethod
    def exchange_code_for_access_token(code, redirect_uri, client_id, client_secret=None, state=None):
        query = urlencode(
            {
                "grant_type": "authorization_code",
                "client_id": client_id,
                "client_secret": client_secret,
                "code": code,
                "state": state,
            }
        )
        data = _get_public_json(f"{NaverOAuthClient.TOKEN_URL}?{query}")
        return data.get("access_token")

    @staticmethod
    def get_user_info(access_token):
        data = _get_json(NaverOAuthClient.USER_INFO_URL, access_token)
        profile = data.get("response", {})

        return {
            "provider": "naver",
            "social_id": profile.get("id"),
            "social_email": profile.get("email"),
            "social_nickname": profile.get("nickname") or profile.get("name"),
            "profile_img_url": profile.get("profile_image"),
            "email_verified": bool(profile.get("email")),
        }


def _get_json(url, access_token):
    request = Request(url, headers={"Authorization": f"Bearer {access_token}"})

    try:
        with urlopen(request, timeout=5) as response:
            return json.loads(response.read().decode("utf-8"))
    except (HTTPError, URLError, TimeoutError) as e:
        raise ValueError("Failed to verify Naver access token") from e


def _get_public_json(url):
    request = Request(url)

    try:
        with urlopen(request, timeout=5) as response:
            return json.loads(response.read().decode("utf-8"))
    except (HTTPError, URLError, TimeoutError) as e:
        raise ValueError("Failed to exchange Naver authorization code") from e
