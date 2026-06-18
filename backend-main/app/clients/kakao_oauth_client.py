import json
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


class KakaoOAuthClient:
    USER_INFO_URL = "https://kapi.kakao.com/v2/user/me"

    @staticmethod
    def get_user_info(access_token):
        data = _get_json(KakaoOAuthClient.USER_INFO_URL, access_token)
        kakao_account = data.get("kakao_account", {})
        profile = kakao_account.get("profile", {})

        return {
            "provider": "kakao",
            "social_id": str(data.get("id")) if data.get("id") is not None else None,
            "social_email": kakao_account.get("email"),
            "social_nickname": profile.get("nickname"),
            "profile_img_url": profile.get("profile_image_url"),
            "email_verified": kakao_account.get("is_email_verified", False),
        }


def _get_json(url, access_token):
    request = Request(url, headers={"Authorization": f"Bearer {access_token}"})

    try:
        with urlopen(request, timeout=5) as response:
            return json.loads(response.read().decode("utf-8"))
    except (HTTPError, URLError, TimeoutError) as e:
        raise ValueError("Failed to verify Kakao access token") from e
