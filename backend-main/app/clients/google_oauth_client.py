import json
from urllib.parse import urlencode
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


class GoogleOAuthClient:
    AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth"
    TOKEN_URL = "https://oauth2.googleapis.com/token"
    USER_INFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"
    SCOPES = "openid email profile"

    @staticmethod
    def get_authorization_url(client_id, redirect_uri, state):
        query = urlencode(
            {
                "client_id": client_id,
                "redirect_uri": redirect_uri,
                "response_type": "code",
                "scope": GoogleOAuthClient.SCOPES,
                "state": state,
                "access_type": "offline",
                "prompt": "consent",
            }
        )
        return f"{GoogleOAuthClient.AUTHORIZE_URL}?{query}"

    @staticmethod
    def exchange_code_for_access_token(code, redirect_uri, client_id, client_secret=None, state=None):
        data = _post_form(
            GoogleOAuthClient.TOKEN_URL,
            {
                "client_id": client_id,
                "client_secret": client_secret,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": redirect_uri,
            },
        )
        return data.get("access_token")

    @staticmethod
    def get_user_info(access_token):
        data = _get_json(GoogleOAuthClient.USER_INFO_URL, access_token)

        return {
            "provider": "google",
            "social_id": data.get("sub"),
            "social_email": data.get("email"),
            "social_nickname": data.get("name"),
            "profile_img_url": data.get("picture"),
            "email_verified": data.get("email_verified", False),
        }


def _get_json(url, access_token):
    request = Request(url, headers={"Authorization": f"Bearer {access_token}"})

    try:
        with urlopen(request, timeout=5) as response:
            return json.loads(response.read().decode("utf-8"))
    except (HTTPError, URLError, TimeoutError) as e:
        raise ValueError("Failed to verify Google access token") from e


def _post_form(url, payload):
    body = urlencode({key: value for key, value in payload.items() if value is not None}).encode("utf-8")
    request = Request(
        url,
        data=body,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )

    try:
        with urlopen(request, timeout=5) as response:
            return json.loads(response.read().decode("utf-8"))
    except (HTTPError, URLError, TimeoutError) as e:
        raise ValueError("Failed to exchange Google authorization code") from e
