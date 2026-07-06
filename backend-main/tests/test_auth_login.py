from types import SimpleNamespace

from app.repositories.member_repository import MemberRepository
from app.services.auth_service import AuthService
from app.utils.security import hash_password


def _member(member_id, password):
    return SimpleNamespace(
        id=member_id,
        active=True,
        deleted_at=None,
        password_hash=hash_password(password),
        last_login_at=None,
    )


def test_login_checks_all_matching_identifier_candidates(monkeypatch):
    wrong_email_match = _member(1, "wrong-password")
    correct_email_match = _member(2, "correct-password")

    monkeypatch.setattr(
        MemberRepository,
        "list_by_login_identifier",
        staticmethod(lambda identifier: [wrong_email_match, correct_email_match]),
    )
    monkeypatch.setattr("app.services.auth_service.db.session.commit", lambda: None)
    monkeypatch.setattr(
        "app.services.auth_service.member_to_dict",
        lambda member: {"id": member.id},
    )
    monkeypatch.setattr(
        "app.services.auth_service.TokenService.create_token_pair",
        staticmethod(
            lambda member, provider, fresh: {
                "access_token": "access-token",
                "refresh_token": "refresh-token",
            }
        ),
    )

    result = AuthService.login(
        {
            "identifier": "User@Example.COM",
            "password": "correct-password",
        }
    )

    assert result["member"] == {"id": 2}
    assert result["access_token"] == "access-token"
    assert correct_email_match.last_login_at is not None
