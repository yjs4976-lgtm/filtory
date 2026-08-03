import json
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlsplit, urlunsplit
from urllib.request import Request, urlopen


SUPABASE_API_PATH_SUFFIXES = ("/storage/v1", "/rest/v1", "/auth/v1")


class SupabaseStorageClient:
    """Supabase Storage 객체 작업만 담당하는 REST 어댑터다.

    secret key는 요청 헤더에만 사용하고 URL·예외 메시지에 노출하지 않는다. 공개
    URL에서 삭제 경로를 복원할 때도 현재 프로젝트와 bucket 범위를 검증한다.
    """

    def __init__(self, base_url, secret_key, bucket):
        if not base_url or not secret_key:
            raise ValueError("Supabase Storage is not configured")

        self.base_url = _normalize_supabase_project_url(base_url)
        self.secret_key = secret_key
        self.bucket = bucket

    def upload_public_object(self, object_path, content, content_type):
        self.upload_object(object_path, content, content_type)
        return self.public_url(object_path)

    def upload_object(self, object_path, content, content_type):
        object_url = self._object_url(object_path)
        # Supabase Storage REST API는 Authorization과 apikey 헤더를 함께 요구한다.
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
            raise ValueError(f"Storage upload failed: {_read_error_detail(e)}") from e
        except (URLError, TimeoutError) as e:
            raise ValueError("Storage upload failed") from e

        return object_path

    def download_object(self, object_path):
        request = Request(
            self._object_url(object_path),
            headers={
                "Authorization": f"Bearer {self.secret_key}",
                "apikey": self.secret_key,
            },
            method="GET",
        )

        try:
            with urlopen(request, timeout=15) as response:
                content_type = response.headers.get("Content-Type") or "application/octet-stream"
                return response.read(), content_type
        except HTTPError as e:
            raise ValueError(f"Storage download failed: {_read_error_detail(e)}") from e
        except (URLError, TimeoutError) as e:
            raise ValueError("Storage download failed") from e

    def delete_public_url(self, public_url):
        object_path = self.object_path_from_public_url(public_url)
        if not object_path:
            return

        self.delete_object(object_path)

    def delete_object(self, object_path):
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
            # DB 참조는 이미 지워진 상태다. 저장소 정리 실패만으로 프로필 수정까지 실패시키지 않는다.
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
    # 사용자가 /storage/v1 같은 API path까지 넣어도 프로젝트 base URL만 남기도록 정규화한다.
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
