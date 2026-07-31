from urllib.parse import parse_qs, urlparse

from app.clients.google_oauth_client import GoogleOAuthClient
from app.clients.kakao_oauth_client import KakaoOAuthClient
from app.clients.naver_oauth_client import NaverOAuthClient


CLIENT_ID = "client-id"
REDIRECT_URI = "https://filtory.app/api/auth/social-callback"
STATE = "opaque-state"


def _query(url):
    return parse_qs(urlparse(url).query)


def test_kakao_authorization_url_uses_korean_language():
    query = _query(KakaoOAuthClient.get_authorization_url(CLIENT_ID, REDIRECT_URI, STATE))

    assert query == {
        "client_id": [CLIENT_ID],
        "redirect_uri": [REDIRECT_URI],
        "response_type": ["code"],
        "state": [STATE],
        "lang": ["ko"],
    }


def test_google_authorization_url_uses_korean_language():
    query = _query(GoogleOAuthClient.get_authorization_url(CLIENT_ID, REDIRECT_URI, STATE))

    assert query == {
        "client_id": [CLIENT_ID],
        "redirect_uri": [REDIRECT_URI],
        "response_type": ["code"],
        "scope": [GoogleOAuthClient.SCOPES],
        "state": [STATE],
        "access_type": ["offline"],
        "prompt": ["consent"],
        "hl": ["ko"],
    }


def test_naver_authorization_url_keeps_documented_parameters_only():
    query = _query(NaverOAuthClient.get_authorization_url(CLIENT_ID, REDIRECT_URI, STATE))

    assert query == {
        "client_id": [CLIENT_ID],
        "redirect_uri": [REDIRECT_URI],
        "response_type": ["code"],
        "state": [STATE],
    }
