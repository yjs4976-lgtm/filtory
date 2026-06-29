import json
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlsplit, urlunsplit
from urllib.request import Request, urlopen


SUPABASE_API_PATH_SUFFIXES = ("/storage/v1", "/rest/v1", "/auth/v1")


class SupabaseStorageClient:
    def __init__(self, base_url, secret_key, bucket):
        if not base_url or not secret_key:
            raise ValueError("Supabase Storage is not configured")

        self.base_url = _normalize_supabase_project_url(base_url)
        self.secret_key = secret_key
        self.bucket = bucket

    def upload_public_object(self, object_path, content, content_type):
        object_url = self._object_url(object_path)
        request = Request(
            object_url,
            data=content,
            headers={
                "Authorization": f"Bearer {self.secret_key}",
                "apikey": self.secret_key,
                "Content-Type": content_type,
                "x-upsert": "false",
            },
            method="POST",
        )

        try:
            with urlopen(request, timeout=15):
                pass
        except HTTPError as e:
            raise ValueError(f"Profile image upload failed: {_read_error_detail(e)}") from e
        except (URLError, TimeoutError) as e:
            raise ValueError("Profile image upload failed") from e

        return self.public_url(object_path)

    def delete_public_url(self, public_url):
        object_path = self.object_path_from_public_url(public_url)
        if not object_path:
            return

        request = Request(
            self._object_url(object_path),
            headers={
                "Authorization": f"Bearer {self.secret_key}",
                "apikey": self.secret_key,
            },
            method="DELETE",
        )

        try:
            with urlopen(request, timeout=15):
                pass
        except (HTTPError, URLError, TimeoutError):
            # The database reference has already been cleared. Do not fail profile updates on cleanup.
            return

    def public_url(self, object_path):
        return f"{self.base_url}/storage/v1/object/public/{quote(self.bucket, safe='')}/{quote(object_path, safe='/')}"

    def object_path_from_public_url(self, public_url):
        prefix = f"{self.base_url}/storage/v1/object/public/{quote(self.bucket, safe='')}/"
        if not public_url or not public_url.startswith(prefix):
            return None
        return public_url.removeprefix(prefix)

    def _object_url(self, object_path):
        return f"{self.base_url}/storage/v1/object/{quote(self.bucket, safe='')}/{quote(object_path, safe='/')}"


def _normalize_supabase_project_url(base_url):
    parts = urlsplit(str(base_url).strip().rstrip("/"))
    path = parts.path.rstrip("/")

    for suffix in SUPABASE_API_PATH_SUFFIXES:
        if path.endswith(suffix):
            path = path.removesuffix(suffix)
            break

    return urlunsplit((parts.scheme, parts.netloc, path, "", "")).rstrip("/")


def _read_error_detail(error):
    try:
        raw_body = error.read().decode("utf-8")
        return json.loads(raw_body).get("message", raw_body)
    except Exception:
        return f"HTTP {error.code}"
