import os
from datetime import timedelta
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent / ".env")


def _float_or_default(value, default):
    try:
        return float(value) if value else default
    except (TypeError, ValueError):
        return default


class Config:
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_pre_ping": True,
    }

    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-secret-key-change-me-please-32-bytes")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(
        minutes=int(os.getenv("JWT_ACCESS_TOKEN_EXPIRES_MINUTES", "15"))
    )
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(
        days=int(os.getenv("JWT_REFRESH_TOKEN_EXPIRES_DAYS", "14"))
    )
    JWT_TOKEN_LOCATION = ["cookies"]
    JWT_COOKIE_SECURE = os.getenv("JWT_COOKIE_SECURE", "false").lower() == "true"
    JWT_COOKIE_SAMESITE = os.getenv("JWT_COOKIE_SAMESITE", "Lax")
    JWT_COOKIE_CSRF_PROTECT = os.getenv("JWT_COOKIE_CSRF_PROTECT", "false").lower() == "true"
    JWT_ACCESS_COOKIE_PATH = "/"
    JWT_REFRESH_COOKIE_PATH = "/api/auth/refresh"

    FRONTEND_BASE_URL = os.getenv("FRONTEND_BASE_URL", "http://localhost:3000")
    FRONTEND_CALLBACK_URL = os.getenv(
        "FRONTEND_CALLBACK_URL",
        f"{FRONTEND_BASE_URL.rstrip('/')}/auth/callback",
    )
    CORS_ORIGINS = [
        origin.strip()
        for origin in os.getenv("CORS_ORIGINS", FRONTEND_BASE_URL).split(",")
        if origin.strip()
    ]

    SMTP_HOST = os.getenv("SMTP_HOST")
    SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USERNAME = os.getenv("SMTP_USERNAME")
    SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
    SMTP_USE_TLS = os.getenv("SMTP_USE_TLS", "true").lower() == "true"
    SMTP_DEFAULT_SENDER = os.getenv("SMTP_DEFAULT_SENDER")

    SUPABASE_URL = os.getenv("SUPABASE_URL")
    SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")
    SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    SUPABASE_SECRET_KEY = os.getenv("SUPABASE_SECRET_KEY")
    SUPABASE_STORAGE_KEY = (
        SUPABASE_SERVICE_ROLE_KEY
        or SUPABASE_SECRET_KEY
    )
    SUPABASE_PROFILE_IMAGE_BUCKET = os.getenv("SUPABASE_PROFILE_IMAGE_BUCKET", "profile-images")
    SUPABASE_INQUIRY_ATTACHMENT_BUCKET = os.getenv("SUPABASE_INQUIRY_ATTACHMENT_BUCKET", "inquiry-attachments")

    GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
    GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
    GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI")
    KAKAO_CLIENT_ID = os.getenv("KAKAO_CLIENT_ID")
    KAKAO_CLIENT_SECRET = os.getenv("KAKAO_CLIENT_SECRET")
    KAKAO_REDIRECT_URI = os.getenv("KAKAO_REDIRECT_URI")
    NAVER_CLIENT_ID = os.getenv("NAVER_CLIENT_ID")
    NAVER_CLIENT_SECRET = os.getenv("NAVER_CLIENT_SECRET")
    NAVER_REDIRECT_URI = os.getenv("NAVER_REDIRECT_URI")
    KAKAO_REST_API_KEY = os.getenv("KAKAO_REST_API_KEY")
    NAVER_SEARCH_CLIENT_ID = os.getenv("NAVER_SEARCH_CLIENT_ID")
    NAVER_SEARCH_CLIENT_SECRET = os.getenv("NAVER_SEARCH_CLIENT_SECRET")
    HOSPITAL_SEARCH_TIMEOUT_SECONDS = _float_or_default(os.getenv("HOSPITAL_SEARCH_TIMEOUT_SECONDS"), 4)
    HOSPITAL_SEARCH_CACHE_TTL_SECONDS = _float_or_default(os.getenv("HOSPITAL_SEARCH_CACHE_TTL_SECONDS"), 300)

    BACKEND_AI_BASE_URL = os.getenv("BACKEND_AI_BASE_URL", "http://127.0.0.1:8000")
    BACKEND_AI_TIMEOUT_SECONDS = _float_or_default(os.getenv("BACKEND_AI_TIMEOUT_SECONDS"), 20)
