from flask import Flask

from app.services.profile_image_service import ProfileImageService


def create_test_app(**config):
    app = Flask(__name__)
    app.config.update(
        SUPABASE_URL="https://project.supabase.co",
        SUPABASE_PROFILE_IMAGE_BUCKET="profile-images",
        **config,
    )
    return app


def test_storage_client_prefers_service_role_key():
    app = create_test_app(
        SUPABASE_STORAGE_KEY="service-role-key",
        SUPABASE_SECRET_KEY="legacy-secret-key",
        SUPABASE_ANON_KEY="anon-key",
    )

    with app.app_context():
        storage = ProfileImageService._storage_client()

    assert storage.secret_key == "service-role-key"


def test_storage_client_falls_back_to_legacy_secret_key():
    app = create_test_app(
        SUPABASE_STORAGE_KEY=None,
        SUPABASE_SECRET_KEY="legacy-secret-key",
        SUPABASE_ANON_KEY="anon-key",
    )

    with app.app_context():
        storage = ProfileImageService._storage_client()

    assert storage.secret_key == "legacy-secret-key"


def test_storage_client_falls_back_to_anon_key():
    app = create_test_app(
        SUPABASE_STORAGE_KEY=None,
        SUPABASE_SECRET_KEY=None,
        SUPABASE_ANON_KEY="anon-key",
    )

    with app.app_context():
        storage = ProfileImageService._storage_client()

    assert storage.secret_key == "anon-key"
