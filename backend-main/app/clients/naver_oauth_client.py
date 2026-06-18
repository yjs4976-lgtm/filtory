import json
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


class NaverOAuthClient:
    USER_INFO_URL = "https://openapi.naver.com/v1/nid/me"

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
