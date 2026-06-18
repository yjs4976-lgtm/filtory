import json
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


class GoogleOAuthClient:
    USER_INFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"

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
