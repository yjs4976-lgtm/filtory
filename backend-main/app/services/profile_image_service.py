from uuid import uuid4

from flask import current_app

from app.clients.supabase_storage_client import SupabaseStorageClient
from app.extensions import db
from app.repositories import MemberRepository
from app.schemas import member_to_dict


class ProfileImageService:
    MAX_FILE_SIZE = 2 * 1024 * 1024
    ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
    EXTENSIONS = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
    }

    @staticmethod
    def upload(member_id, image_file):
        if not image_file or not image_file.filename:
            raise ValueError("image file is required")
        if image_file.mimetype not in ProfileImageService.ALLOWED_CONTENT_TYPES:
            raise ValueError("Only JPEG, PNG, and WebP images are allowed")

        content = image_file.stream.read(ProfileImageService.MAX_FILE_SIZE + 1)
        if not content:
            raise ValueError("image file is required")
        if len(content) > ProfileImageService.MAX_FILE_SIZE:
            raise ValueError("Profile image must be 2 MB or smaller")

        member = MemberRepository.get_by_id(member_id)
        if not member:
            raise ValueError("Member not found")

        storage = ProfileImageService._storage_client()
        extension = ProfileImageService.EXTENSIONS[image_file.mimetype]
        object_path = f"members/{member_id}/{uuid4().hex}.{extension}"
        image_url = storage.upload_public_object(object_path, content, image_file.mimetype)
        previous_image_url = member.profile_img_url

        try:
            member.profile_img_url = image_url
            db.session.commit()
        except Exception:
            db.session.rollback()
            storage.delete_public_url(image_url)
            raise

        storage.delete_public_url(previous_image_url)
        return member_to_dict(member)

    @staticmethod
    def remove(member_id):
        member = MemberRepository.get_by_id(member_id)
        if not member:
            raise ValueError("Member not found")

        previous_image_url = member.profile_img_url
        try:
            member.profile_img_url = None
            db.session.commit()
        except Exception:
            db.session.rollback()
            raise

        if previous_image_url:
            try:
                ProfileImageService._storage_client().delete_public_url(previous_image_url)
            except ValueError:
                pass
        return member_to_dict(member)

    @staticmethod
    def _storage_client():
        return SupabaseStorageClient(
            current_app.config.get("SUPABASE_URL"),
            current_app.config.get("SUPABASE_STORAGE_KEY")
            or current_app.config.get("SUPABASE_SERVICE_ROLE_KEY")
            or current_app.config.get("SUPABASE_SECRET_KEY")
            or current_app.config.get("SUPABASE_ANON_KEY"),
            current_app.config.get("SUPABASE_PROFILE_IMAGE_BUCKET", "profile-images"),
        )
