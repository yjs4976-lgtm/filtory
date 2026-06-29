from app.clients.supabase_storage_client import SupabaseStorageClient


def test_storage_client_accepts_project_url():
    storage = SupabaseStorageClient(
        "https://project.supabase.co",
        "secret-key",
        "profile-images",
    )

    assert (
        storage._object_url("members/1/profile.jpg")
        == "https://project.supabase.co/storage/v1/object/profile-images/members/1/profile.jpg"
    )


def test_storage_client_normalizes_storage_api_url():
    storage = SupabaseStorageClient(
        "https://project.supabase.co/storage/v1",
        "secret-key",
        "profile-images",
    )

    assert (
        storage._object_url("members/1/profile.jpg")
        == "https://project.supabase.co/storage/v1/object/profile-images/members/1/profile.jpg"
    )
    assert (
        storage.public_url("members/1/profile.jpg")
        == "https://project.supabase.co/storage/v1/object/public/profile-images/members/1/profile.jpg"
    )


def test_storage_client_normalizes_rest_api_url():
    storage = SupabaseStorageClient(
        "https://project.supabase.co/rest/v1",
        "secret-key",
        "profile-images",
    )

    assert (
        storage._object_url("members/1/profile.jpg")
        == "https://project.supabase.co/storage/v1/object/profile-images/members/1/profile.jpg"
    )
