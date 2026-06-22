import json
from urllib.parse import urlencode
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


class KakaoOAuthClient:
    AUTHORIZE_URL = "https://kauth.kakao.com/oauth/authorize"
    TOKEN_URL = "https://kauth.kakao.com/oauth/token"
    USER_INFO_URL = "https://kapi.kakao.com/v2/user/me"

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
        return f"{KakaoOAuthClient.AUTHORIZE_URL}?{query}"

    @staticmethod
    def exchange_code_for_access_token(code, redirect_uri, client_id, client_secret=None, state=None):
        payload = {
            "grant_type": "authorization_code",
            "client_id": client_id,
            "redirect_uri": redirect_uri,
            "code": code,
        }

        if client_secret:
            payload["client_secret"] = client_secret

        data = _post_form(KakaoOAuthClient.TOKEN_URL, payload)
        return data.get("access_token")

    @staticmethod
    def get_user_info(access_token):
        data = _get_json(KakaoOAuthClient.USER_INFO_URL, access_token)
        kakao_account = data.get("kakao_account", {})
        profile = kakao_account.get("profile", {})
        properties = data.get("properties", {})
        nickname = profile.get("nickname") or properties.get("nickname")
        profile_img_url = (
            profile.get("profile_image_url")
            or properties.get("profile_image")
            or properties.get("thumbnail_image")
        )

        return {
            "provider": "kakao",
            "social_id": str(data.get("id")) if data.get("id") is not None else None,
            "social_email": kakao_account.get("email"),
            "social_nickname": nickname,
            "profile_img_url": profile_img_url,
            "email_verified": bool(
                kakao_account.get("is_email_verified")
                and kakao_account.get("is_email_valid")
            ),
        }


def _get_json(url, access_token):
    request = Request(url, headers={"Authorization": f"Bearer {access_token}"})

    try:
        with urlopen(request, timeout=5) as response:
            return json.loads(response.read().decode("utf-8"))
    except (HTTPError, URLError, TimeoutError) as e:
        raise ValueError("Failed to verify Kakao access token") from e


def _post_form(url, payload):
    body = urlencode({key: value for key, value in payload.items() if value is not None}).encode("utf-8")
    request = Request(
        url,
        data=body,
        headers={"Content-Type": "application/x-www-form-urlencoded;charset=utf-8"},
        method="POST",
    )

    try:
        with urlopen(request, timeout=5) as response:
            return json.loads(response.read().decode("utf-8"))
    except HTTPError as e:
        detail = _read_error_detail(e)
        raise ValueError(f"Failed to exchange Kakao authorization code: {detail}") from e
    except (URLError, TimeoutError) as e:
        raise ValueError("Failed to exchange Kakao authorization code") from e


def _read_error_detail(error):
    try:
        raw_body = error.read().decode("utf-8")
    except Exception:
        raw_body = ""

    if not raw_body:
        return f"HTTP {error.code}"

    try:
        body = json.loads(raw_body)
    except json.JSONDecodeError:
        return raw_body

    error_code = body.get("error")
    description = body.get("error_description")

    if error_code and description:
        return f"{error_code} - {description}"

    return error_code or description or raw_body
