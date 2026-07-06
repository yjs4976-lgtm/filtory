import pytest
from fastapi import HTTPException

from app.api.chatbot_api import _verify_internal_token


def test_chatbot_internal_token_configuration_is_required():
    with pytest.raises(HTTPException) as exc:
        _verify_internal_token(None, None)

    assert exc.value.status_code == 503


def test_chatbot_internal_token_header_is_required():
    with pytest.raises(HTTPException) as exc:
        _verify_internal_token("secret-token", None)

    assert exc.value.status_code == 401


def test_chatbot_invalid_internal_token_is_rejected():
    with pytest.raises(HTTPException) as exc:
        _verify_internal_token("secret-token", "wrong-token")

    assert exc.value.status_code == 401


def test_chatbot_matching_internal_token_is_accepted():
    _verify_internal_token("secret-token", "secret-token")
