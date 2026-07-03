import html
import hashlib
import json
import re
import time
from decimal import Decimal, InvalidOperation
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urlparse
from urllib.request import Request, urlopen

from flask import current_app


class HospitalSearchProvider:
    KAKAO_KEYWORD_URL = "https://dapi.kakao.com/v2/local/search/keyword.json"
    NAVER_LOCAL_URL = "https://openapi.naver.com/v1/search/local.json"
    KAKAO_CATEGORY_GROUP_CODE = "HP8"
    REGION_LABELS = {
        "seoul": "서울",
        "busan": "부산",
        "incheon": "인천",
        "daegu": "대구",
        "daejeon": "대전",
        "gwangju": "광주",
        "ulsan": "울산",
        "sejong": "세종",
        "gyeonggi": "경기",
        "gangwon": "강원",
        "chungbuk": "충북",
        "chungnam": "충남",
        "jeonbuk": "전북",
        "jeonnam": "전남",
        "gyeongbuk": "경북",
        "gyeongnam": "경남",
        "jeju": "제주",
    }
    CATEGORY_KEYWORDS = {
        "dermatology": "피부과",
        "ophthalmology": "안과",
        "dentistry": "치과",
    }
    SUPPORTED_CATEGORIES = {"dermatology", "ophthalmology", "dentistry"}
    _CACHE = {}

    @classmethod
    def search(cls, *, keyword="", category=None, region=None, limit=10):
        limit = max(1, int(limit or 10))
        search_region = cls.REGION_LABELS.get(str(region or "").strip().lower(), region)
        query = cls._build_query(keyword=keyword, category=category, region=search_region)
        if not query:
            return []

        cache_key = cls._cache_key(query=query, category=category, limit=limit)
        cached_results = cls._get_cached(cache_key)
        if cached_results is not None:
            return cached_results[:limit]

        naver_results = cls.search_naver(
            query=query,
            category=category,
            limit=limit,
        )
        if len(naver_results) >= limit:
            results = naver_results[:limit]
            cls._set_cached(cache_key, results)
            return results

        remaining_limit = max(0, limit - len(naver_results))
        kakao_results = cls.search_kakao(query=query, category=category, limit=remaining_limit)
        results = cls._dedupe([*naver_results, *kakao_results])[:limit]
        cls._set_cached(cache_key, results)
        return results

    @classmethod
    def search_kakao(cls, *, query, category=None, limit=10):
        api_key = current_app.config.get("KAKAO_REST_API_KEY")
        if not api_key:
            return []

        params = {
            "query": query,
            "size": max(1, min(limit, 15)),
            "category_group_code": cls.KAKAO_CATEGORY_GROUP_CODE,
        }

        payload = cls._get_json(
            f"{cls.KAKAO_KEYWORD_URL}?{urlencode(params)}",
            {"Authorization": f"KakaoAK {api_key}"},
        )
        documents = payload.get("documents") if isinstance(payload, dict) else []
        if not isinstance(documents, list):
            return []

        results = []
        for item in documents:
            if not isinstance(item, dict):
                continue
            if item.get("category_group_code") != cls.KAKAO_CATEGORY_GROUP_CODE:
                continue
            result = cls._from_kakao(item, category)
            if cls._matches_requested_category(result.get("category"), category):
                results.append(result)
        return results

    @classmethod
    def search_naver(cls, *, query, category=None, limit=10):
        client_id = current_app.config.get("NAVER_SEARCH_CLIENT_ID")
        client_secret = current_app.config.get("NAVER_SEARCH_CLIENT_SECRET")
        if not client_id or not client_secret or limit <= 0:
            if limit > 0:
                current_app.logger.info("Naver hospital search skipped: missing search API configuration")
            return []

        payload = cls._get_json(
            f"{cls.NAVER_LOCAL_URL}?{urlencode({'query': query, 'display': max(1, min(limit, 5))})}",
            {
                "X-Naver-Client-Id": client_id,
                "X-Naver-Client-Secret": client_secret,
            },
        )
        items = payload.get("items") if isinstance(payload, dict) else []
        if not isinstance(items, list):
            current_app.logger.warning("Naver hospital search returned no items list")
            return []

        results = []
        for item in items:
            if not isinstance(item, dict) or not cls._is_naver_hospital(item):
                continue
            result = cls._from_naver(item, category)
            if cls._matches_requested_category(result.get("category"), category):
                results.append(result)
        if items and not results:
            current_app.logger.info(
                "Naver hospital search returned %s items but all were filtered out for category=%s",
                len(items),
                category,
            )
        return results

    @classmethod
    def _build_query(cls, *, keyword="", category=None, region=None):
        category_keyword = cls.CATEGORY_KEYWORDS.get(category or "", "")
        if not category_keyword and region and not keyword:
            category_keyword = "병원"
        parts = [region, keyword, category_keyword]
        seen = set()
        cleaned = []
        for part in parts:
            value = str(part or "").strip()
            if not value:
                continue
            normalized = value.lower()
            if normalized in seen:
                continue
            seen.add(normalized)
            cleaned.append(value)
        return " ".join(cleaned)

    @staticmethod
    def _get_json(url, headers):
        request = Request(url, headers=headers)
        timeout = current_app.config.get("HOSPITAL_SEARCH_TIMEOUT_SECONDS", 4)
        try:
            with urlopen(request, timeout=timeout) as response:
                return json.loads(response.read().decode("utf-8"))
        except HTTPError as exc:
            current_app.logger.warning("Hospital search provider request failed: status=%s", exc.code)
            return {}
        except (URLError, TimeoutError, OSError) as exc:
            current_app.logger.warning("Hospital search provider unavailable: %s", type(exc).__name__)
            return {}
        except json.JSONDecodeError:
            current_app.logger.warning("Hospital search provider returned invalid JSON")
            return {}

    @classmethod
    def _from_kakao(cls, item, category):
        latitude = cls._decimal_or_none(item.get("y"))
        longitude = cls._decimal_or_none(item.get("x"))
        place_url = cls._text(item.get("place_url"))
        provider_category = cls._category_from_kakao(item)

        return {
            "id": f"kakao:{cls._text(item.get('id'))}",
            "provider": "kakao",
            "source_provider": "kakao",
            "external_place_id": cls._text(item.get("id")),
            "hospital_name": cls._text(item.get("place_name")) or "병원",
            "category": provider_category,
            "region": cls._region_from_address(cls._text(item.get("address_name"))),
            "address": cls._text(item.get("address_name")),
            "road_address": cls._text(item.get("road_address_name")),
            "phone": cls._text(item.get("phone")),
            "map_url": place_url,
            "kakao_place_url": place_url,
            "naver_place_url": None,
            "naver_place_id": None,
            "source_url": place_url,
            "source_name": "Kakao",
            "latitude": latitude,
            "longitude": longitude,
            "naver_rating": None,
            "naver_review_count": None,
            "google_rating": None,
            "google_review_count": None,
            "is_official_hospital": False,
            "official_source": None,
        }

    @classmethod
    def _from_naver(cls, item, category):
        link = cls._text(item.get("link"))
        place_url = cls._verified_naver_place_url(link)
        provider_category = cls._category_from_naver(item) or category
        longitude = cls._naver_coordinate(item.get("mapx"))
        latitude = cls._naver_coordinate(item.get("mapy"))

        return {
            "id": f"naver:{cls._stable_id(item)}",
            "provider": "naver",
            "source_provider": "naver",
            "external_place_id": cls._stable_id(item),
            "hospital_name": cls._strip_html(item.get("title")) or "병원",
            "category": provider_category,
            "region": cls._region_from_address(cls._strip_html(item.get("address"))),
            "address": cls._strip_html(item.get("address")),
            "road_address": cls._strip_html(item.get("roadAddress")),
            "phone": cls._text(item.get("telephone")),
            "map_url": place_url,
            "naver_place_url": place_url,
            "naver_place_id": cls._naver_place_id_from_link(place_url),
            "source_url": link,
            "source_name": "Naver",
            "latitude": latitude,
            "longitude": longitude,
            "naver_rating": cls._optional_decimal(
                cls._first_present(item.get("rating"), item.get("naverRating"), item.get("naver_rating"))
            ),
            "naver_review_count": cls._optional_int(
                cls._first_present(
                    item.get("reviewCount"),
                    item.get("visitorReviewCount"),
                    item.get("naverReviewCount"),
                    item.get("naver_review_count"),
                )
            ),
            "google_rating": None,
            "google_review_count": None,
            "is_official_hospital": False,
            "official_source": None,
        }

    @staticmethod
    def _dedupe(items):
        results = []
        seen = set()
        for item in items:
            key = (
                str(item.get("hospital_name") or "").strip().lower(),
                str(item.get("road_address") or item.get("address") or "").strip().lower(),
            )
            if key in seen:
                continue
            seen.add(key)
            results.append(item)
        return results

    @staticmethod
    def _text(value):
        return str(value).strip() if value not in (None, "") else None

    @staticmethod
    def _strip_html(value):
        if value in (None, ""):
            return None
        return html.unescape(re.sub(r"<[^>]+>", "", str(value))).strip()

    @staticmethod
    def _stable_id(item):
        source = "|".join(
            str(item.get(key) or "")
            for key in ("title", "roadAddress", "address", "link")
        )
        return hashlib.sha1(source.encode("utf-8")).hexdigest()[:16]

    @staticmethod
    def _decimal_or_none(value):
        if value in (None, ""):
            return None
        try:
            return float(Decimal(str(value)))
        except (InvalidOperation, ValueError):
            return None

    @staticmethod
    def _naver_coordinate(value):
        if value in (None, ""):
            return None
        try:
            return float(Decimal(str(value)) / Decimal("10000000"))
        except (InvalidOperation, ValueError):
            return None

    @staticmethod
    def _optional_decimal(value):
        if value in (None, ""):
            return None
        try:
            return float(Decimal(str(value)))
        except (InvalidOperation, ValueError):
            return None

    @staticmethod
    def _optional_int(value):
        if value in (None, ""):
            return None
        try:
            return int(Decimal(str(value)))
        except (InvalidOperation, ValueError):
            return None

    @staticmethod
    def _first_present(*values):
        for value in values:
            if value is not None and value != "":
                return value
        return None

    @staticmethod
    def _naver_place_id_from_link(link):
        text = str(link or "")
        match = re.search(r"(?:entry/place|place|hospital|clinic)/(\d+)", text)
        if match:
            return match.group(1)

        match = re.search(r"(?:placeId|id)=(\d+)", text)
        if match:
            return match.group(1)

        return None

    @staticmethod
    def _verified_naver_place_url(link):
        if not link:
            return None

        try:
            hostname = (urlparse(link).hostname or "").lower()
        except ValueError:
            return None

        if hostname == "map.naver.com" or hostname.endswith(".place.naver.com"):
            return link

        return None

    @classmethod
    def _category_from_kakao(cls, item):
        return cls._category_from_text(
            f"{item.get('category_name') or ''} {item.get('place_name') or ''}"
        )

    @classmethod
    def _category_from_naver(cls, item):
        return cls._category_from_text(
            f"{cls._strip_html(item.get('category')) or ''} {cls._strip_html(item.get('title')) or ''}"
        )

    @staticmethod
    def _category_from_text(value):
        text = str(value or "").lower()
        if any(keyword in text for keyword in ("피부", "derma", "skin")):
            return "dermatology"
        if any(keyword in text for keyword in ("안과", "안경", "ophthalm", "eye")):
            return "ophthalmology"
        if any(keyword in text for keyword in ("치과", "dental", "dentist")):
            return "dentistry"
        return None

    @classmethod
    def _matches_requested_category(cls, result_category, requested_category):
        if result_category not in cls.SUPPORTED_CATEGORIES:
            return False
        return not requested_category or result_category == requested_category

    @classmethod
    def _is_naver_hospital(cls, item):
        category = cls._strip_html(item.get("category")) or ""
        title = cls._strip_html(item.get("title")) or ""
        text = f"{category} {title}"
        if "한의원" in text:
            return False

        return any(
            keyword in text
            for keyword in ("병원", "의원", "클리닉", "피부과", "안과", "치과")
        )

    @staticmethod
    def _cache_key(*, query, category, limit):
        return (
            str(query or "").strip().lower(),
            str(category or "").strip().lower(),
            int(limit or 10),
            bool(current_app.config.get("NAVER_SEARCH_CLIENT_ID"))
            and bool(current_app.config.get("NAVER_SEARCH_CLIENT_SECRET")),
            bool(current_app.config.get("KAKAO_REST_API_KEY")),
        )

    @classmethod
    def _get_cached(cls, key):
        cached = cls._CACHE.get(key)
        if not cached:
            return None
        expires_at, results = cached
        if expires_at < time.monotonic():
            cls._CACHE.pop(key, None)
            return None
        return list(results)

    @classmethod
    def _set_cached(cls, key, results):
        ttl = current_app.config.get("HOSPITAL_SEARCH_CACHE_TTL_SECONDS", 300)
        if ttl <= 0:
            return
        cls._CACHE[key] = (time.monotonic() + ttl, list(results))

    @staticmethod
    def _region_from_address(address):
        if not address:
            return None
        parts = str(address).split()
        return " ".join(parts[:2]) if len(parts) >= 2 else parts[0]
