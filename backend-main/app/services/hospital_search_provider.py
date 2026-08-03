import html
import hashlib
import json
import re
import time
from decimal import Decimal, InvalidOperation
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlencode, urlparse
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
        "orthopedics": "정형외과",
    }
    SUPPORTED_CATEGORIES = {"dermatology", "ophthalmology", "dentistry", "orthopedics"}
    _CACHE = {}

    @classmethod
    def search(cls, *, keyword="", category=None, region=None, limit=10):
        limit = max(1, int(limit or 10))
        search_region = cls.REGION_LABELS.get(str(region or "").strip().lower(), region)
        query_variants = cls._build_query_variants(
            keyword=keyword,
            category=category,
            region=search_region,
        )
        if not query_variants:
            return []

        naver_configured = cls._has_naver_config()
        cache_key = cls._cache_key(queries=query_variants, category=category, limit=limit)
        cached_results = cls._get_cached(cache_key)
        if cached_results is not None:
            return cached_results[:limit]

        naver_results = []
        for query in query_variants:
            remaining_limit = limit - len(naver_results)
            if remaining_limit <= 0:
                break
            naver_results = cls._dedupe(
                [
                    *naver_results,
                    *cls.search_naver(
                        query=query,
                        category=category,
                        limit=remaining_limit,
                    ),
                ]
            )

        if len(naver_results) >= limit:
            results = naver_results[:limit]
            cls._set_cached(cache_key, results)
            return results

        # 네이버 결과를 우선 쓰되, 부족한 경우에만 카카오로 보충한다.
        # 진료과가 명확하지 않은 네이버 결과는 아래 category 필터에서 과장 표시를 막는다.
        kakao_results = []
        for query in query_variants:
            remaining_limit = limit - len(naver_results) - len(kakao_results)
            if remaining_limit <= 0:
                break
            kakao_results = cls._dedupe(
                [
                    *kakao_results,
                    *cls.search_kakao(query=query, category=category, limit=remaining_limit),
                ]
            )

        results = cls._dedupe([*naver_results, *kakao_results])[:limit]
        if naver_results or not naver_configured:
            cls._set_cached(cache_key, results)
        return results

    @classmethod
    def search_kakao(cls, *, query, category=None, limit=10):
        api_key = current_app.config.get("KAKAO_REST_API_KEY")
        if not api_key:
            return []

        results = []
        page = 1
        max_pages = 2

        while len(results) < limit and page <= max_pages:
            size = max(1, min(limit - len(results), 15))
            params = {
                "query": query,
                "size": size,
                "page": page,
                "category_group_code": cls.KAKAO_CATEGORY_GROUP_CODE,
            }

            payload = cls._get_json(
                f"{cls.KAKAO_KEYWORD_URL}?{urlencode(params)}",
                {"Authorization": f"KakaoAK {api_key}"},
            )
            documents = payload.get("documents") if isinstance(payload, dict) else []
            if not isinstance(documents, list) or not documents:
                break

            for item in documents:
                if not isinstance(item, dict):
                    continue
                if item.get("category_group_code") != cls.KAKAO_CATEGORY_GROUP_CODE:
                    continue
                result = cls._from_kakao(item, category)
                if cls._matches_requested_category(result.get("category"), category):
                    results = cls._dedupe([*results, result])
                    if len(results) >= limit:
                        break

            if len(documents) < size:
                break
            page += 1

        return results[:limit]

    @classmethod
    def search_naver(cls, *, query, category=None, limit=10):
        client_id = current_app.config.get("NAVER_SEARCH_CLIENT_ID")
        client_secret = current_app.config.get("NAVER_SEARCH_CLIENT_SECRET")
        if not client_id or not client_secret or limit <= 0:
            if limit > 0:
                current_app.logger.info("Naver hospital search skipped: missing search API configuration")
            return []

        results = []
        total_items = 0
        start = 1
        max_pages = 2
        pages_loaded = 0

        while len(results) < limit and pages_loaded < max_pages:
            display = max(1, min(limit - len(results), 5))
            payload = cls._get_json(
                f"{cls.NAVER_LOCAL_URL}?{urlencode({'query': query, 'display': display, 'start': start, 'sort': 'comment'})}",
                {
                    "X-Naver-Client-Id": client_id,
                    "X-Naver-Client-Secret": client_secret,
                },
            )
            items = payload.get("items") if isinstance(payload, dict) else []
            if not isinstance(items, list):
                current_app.logger.warning("Naver hospital search returned no items list")
                return results
            if not items:
                break

            total_items += len(items)
            for item in items:
                if not isinstance(item, dict) or not cls._is_naver_hospital(item):
                    continue
                result = cls._from_naver(item, category)
                if cls._matches_requested_category(result.get("category"), category):
                    results = cls._dedupe([*results, result])
                    if len(results) >= limit:
                        break

            if len(items) < display:
                break
            start += display
            pages_loaded += 1

        if total_items and not results:
            current_app.logger.info(
                "Naver hospital search returned %s items but all were filtered out for category=%s",
                total_items,
                category,
            )
        return results[:limit]

    @staticmethod
    def _has_naver_config():
        return bool(current_app.config.get("NAVER_SEARCH_CLIENT_ID")) and bool(
            current_app.config.get("NAVER_SEARCH_CLIENT_SECRET")
        )

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

    @classmethod
    def _build_query_variants(cls, *, keyword="", category=None, region=None):
        category_keyword = cls.CATEGORY_KEYWORDS.get(category or "", "")
        if not category_keyword and region and not keyword:
            category_keyword = "병원"

        variants = [
            cls._compose_query(region, keyword, category_keyword),
            cls._compose_query(keyword, region),
            cls._compose_query(region, keyword),
            cls._compose_query(keyword, category_keyword),
            cls._compose_query(region, category_keyword),
            cls._compose_query(category_keyword, region),
        ]
        if keyword:
            variants.append(cls._compose_query(keyword))
        elif region:
            variants.append(cls._compose_query(region, "병원"))

        results = []
        seen = set()
        for query in variants:
            if not query:
                continue
            normalized = query.lower()
            if normalized in seen:
                continue
            seen.add(normalized)
            results.append(query)
        return results

    @staticmethod
    def _compose_query(*parts):
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
        homepage_url = None if place_url else cls._verified_homepage_url(link)
        # 네이버 Local API는 종종 "병원,의원" 같은 넓은 분류만 준다.
        # 요청 진료과를 그대로 덮어쓰면 일반 의원이 피부과/치과로 보일 수 있어 실제 추론값만 저장한다.
        provider_category = cls._category_from_naver(item)
        longitude = cls._naver_coordinate(item.get("mapx"))
        latitude = cls._naver_coordinate(item.get("mapy"))
        hospital_name = cls._strip_html(item.get("title")) or "병원"
        address = cls._strip_html(item.get("address"))
        road_address = cls._strip_html(item.get("roadAddress"))
        map_url = place_url or cls._naver_map_search_url(hospital_name, road_address or address)

        return {
            "id": f"naver:{cls._stable_id(item)}",
            "provider": "naver",
            "source_provider": "naver",
            "external_place_id": cls._stable_id(item),
            "hospital_name": hospital_name,
            "category": provider_category,
            "region": cls._region_from_address(address),
            "address": address,
            "road_address": road_address,
            "phone": cls._text(item.get("telephone")),
            "homepage_url": homepage_url,
            "map_url": map_url,
            "naver_place_url": place_url,
            "naver_place_id": cls._naver_place_id_from_link(place_url),
            "source_url": place_url,
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
    def _naver_map_search_url(hospital_name, address=None):
        query = " ".join(str(part or "").strip() for part in (hospital_name, address) if str(part or "").strip())
        if not query:
            return None

        return f"https://map.naver.com/p/search/{quote(query)}"

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

    @staticmethod
    def _verified_homepage_url(link):
        if not link:
            return None

        try:
            parsed = urlparse(link)
        except ValueError:
            return None

        hostname = (parsed.hostname or "").lower()
        if parsed.scheme not in {"http", "https"} or not hostname:
            return None
        if hostname == "map.naver.com" or hostname.endswith(".place.naver.com"):
            return None
        if hostname in {"youtube.com", "www.youtube.com", "youtu.be"}:
            return None
        if parsed.path.rstrip("/") == "/oops":
            return None

        return link

    @classmethod
    def _category_from_kakao(cls, item):
        return cls._category_from_text(
            f"{item.get('category_name') or ''} {item.get('place_name') or ''}"
        )

    @classmethod
    def _category_from_naver(cls, item):
        category = cls._category_from_text(
            f"{cls._strip_html(item.get('category')) or ''} {cls._strip_html(item.get('title')) or ''}"
        )
        if category:
            return category

        if cls._is_naver_hospital(item):
            return None

        return None

    @staticmethod
    def _category_from_text(value):
        text = str(value or "").lower()
        if any(keyword in text for keyword in ("피부", "derma", "skin")):
            return "dermatology"
        if any(keyword in text for keyword in ("안과", "안경", "ophthalm", "eye")):
            return "ophthalmology"
        if any(keyword in text for keyword in ("치과", "dental", "dentist")):
            return "dentistry"
        if any(keyword in text for keyword in ("정형외과", "정형", "관절", "척추", "orthopedic", "orthopedics")):
            return "orthopedics"
        return None

    @classmethod
    def _matches_requested_category(cls, result_category, requested_category):
        if not requested_category:
            return result_category is None or result_category in cls.SUPPORTED_CATEGORIES
        # 특정 진료과 필터가 있을 때는 공급자 데이터나 병원명에서 진료과가 확인된 결과만 통과시킨다.
        return result_category == requested_category

    @classmethod
    def _is_naver_hospital(cls, item):
        category = cls._strip_html(item.get("category")) or ""
        title = cls._strip_html(item.get("title")) or ""
        text = f"{category} {title}"
        if any(keyword in text for keyword in ("한의원", "한방", "약국", "동물병원", "요양원")):
            return False

        return any(
            keyword in text
            for keyword in (
                "건강,의료",
                "의료",
                "병원",
                "의원",
                "클리닉",
                "피부과",
                "안과",
                "치과",
                "외과",
                "내과",
                "정형외과",
                "성형외과",
                "이비인후과",
                "산부인과",
                "정신건강의학과",
            )
        )

    @classmethod
    def _cache_key(cls, *, queries, category, limit):
        return (
            tuple(str(query or "").strip().lower() for query in queries),
            str(category or "").strip().lower(),
            int(limit or 10),
            cls._has_naver_config(),
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
