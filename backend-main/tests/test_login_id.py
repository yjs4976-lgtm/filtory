from app.services.member_service import _is_valid_login_id, _mask_login_id, _normalize_login_id


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
