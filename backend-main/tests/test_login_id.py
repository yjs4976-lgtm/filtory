import pytest

from app.repositories.member_repository import MemberRepository
from app.services.member_service import (
    MemberService,
    _is_valid_login_id,
    _mask_login_id,
    _normalize_email,
    _normalize_login_id,
    _normalize_member_data,
)


def test_normalize_login_id_trims_and_lowercases_value():
    assert _normalize_login_id("  Filtory.User-1  ") == "filtory.user-1"


def test_login_id_requires_allowed_characters_and_length():
    assert _is_valid_login_id("filtory.user-1") is True
    assert _is_valid_login_id("abc") is False
    assert _is_valid_login_id("filtory user") is False
    assert _is_valid_login_id("filtory@user") is False


def test_mask_login_id_keeps_only_a_short_prefix():
    assert _mask_login_id("filtory") == "fil****"
    assert _mask_login_id("abcd") == "abc*"


def test_normalize_email_trims_and_lowercases_value():
    assert _normalize_email("  User@Example.COM  ") == "user@example.com"


def test_normalize_member_data_normalizes_email_and_login_id():
    data = {"email": "  User@Example.COM  ", "login_id": "  Filtory.User-1  "}

    _normalize_member_data(data)

    assert data["email"] == "user@example.com"
    assert data["login_id"] == "filtory.user-1"


def test_create_member_checks_duplicate_with_normalized_email(monkeypatch):
    captured = {}

    def fake_get_by_email(email):
        captured["email"] = email
        return object()

    monkeypatch.setattr(MemberRepository, "get_by_email", staticmethod(fake_get_by_email))

    with pytest.raises(ValueError, match="Email already exists"):
        MemberService.create_member(
            {
                "email": "  User@Example.COM  ",
                "login_id": "filtory.user",
                "password": "password123",
            }
        )

    assert captured["email"] == "user@example.com"


def test_password_reset_looks_up_normalized_email(monkeypatch):
    captured = {}

    def fake_get_by_email(email):
        captured["email"] = email
        return None

    monkeypatch.setattr(MemberRepository, "get_by_email", staticmethod(fake_get_by_email))

    assert MemberService.request_password_reset({"email": "  User@Example.COM  "}) == {
        "requested": True
    }
    assert captured["email"] == "user@example.com"
