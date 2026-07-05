from flask import Flask

from app.services.social_auth_service import SocialAuthService


def make_app():
    app = Flask(__name__)
    app.config.update(
        JWT_SECRET_KEY="test-secret-key",
        FRONTEND_BASE_URL="https://filtory.example",
        FRONTEND_CALLBACK_URL="https://filtory.example/auth/callback",
        CORS_ORIGINS=["https://filtory.example", "https://preview.example"],
    )
    return app


def test_social_auth_next_url_allows_configured_frontend_origin():
    app = make_app()

    with app.app_context():
        assert (
            SocialAuthService.sanitize_frontend_next_url("https://filtory.example/auth/callback?tab=login")
            == "https://filtory.example/auth/callback?tab=login"
        )


def test_social_auth_next_url_rejects_external_origin():
    app = make_app()

    with app.app_context():
        assert (
            SocialAuthService.sanitize_frontend_next_url("https://evil.example/callback")
            == "https://filtory.example/auth/callback"
        )


def test_social_auth_next_url_does_not_reuse_cors_origins():
    app = make_app()

    with app.app_context():
        assert (
            SocialAuthService.sanitize_frontend_next_url("https://preview.example/auth/callback")
            == "https://filtory.example/auth/callback"
        )
