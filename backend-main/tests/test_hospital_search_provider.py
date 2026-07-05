from flask import Flask
from urllib.parse import parse_qs, urlparse

from app.services.hospital_search_provider import HospitalSearchProvider


def test_naver_search_keeps_broad_hospital_category_for_requested_category(monkeypatch):
    app = Flask(__name__)
    app.config.update(
        NAVER_SEARCH_CLIENT_ID="client-id",
        NAVER_SEARCH_CLIENT_SECRET="client-secret",
        HOSPITAL_SEARCH_TIMEOUT_SECONDS=1,
    )

    monkeypatch.setattr(
        HospitalSearchProvider,
        "_get_json",
        staticmethod(
            lambda url, headers: {
                "items": [
                    {
                        "title": "CNP차앤박의원 명동점",
                        "category": "병원,의원",
                        "address": "서울 중구 충무로2가 62-3",
                        "roadAddress": "서울 중구 충무로2가 62-3",
                        "link": "https://map.naver.com/p/entry/place/12345",
                        "mapx": "1269840000",
                        "mapy": "375610000",
                    }
                ]
            },
        ),
    )

    with app.app_context():
        results = HospitalSearchProvider.search_naver(
            query="서울 중구 피부과",
            category="dermatology",
            limit=10,
        )

    assert len(results) == 1
    assert results[0]["source_provider"] == "naver"
    assert results[0]["category"] == "dermatology"
    assert results[0]["naver_place_id"] == "12345"


def test_naver_external_link_is_used_as_homepage_not_place_map_or_source_url(monkeypatch):
    app = Flask(__name__)
    app.config.update(
        NAVER_SEARCH_CLIENT_ID="client-id",
        NAVER_SEARCH_CLIENT_SECRET="client-secret",
        HOSPITAL_SEARCH_TIMEOUT_SECONDS=1,
    )

    monkeypatch.setattr(
        HospitalSearchProvider,
        "_get_json",
        staticmethod(
            lambda url, headers: {
                "items": [
                    {
                        "title": "예시피부과",
                        "category": "병원,의원",
                        "address": "서울 중구 예시로 1",
                        "roadAddress": "서울 중구 예시로 1",
                        "link": "https://clinic.example.com",
                        "mapx": "1269840000",
                        "mapy": "375610000",
                    }
                ]
            },
        ),
    )

    with app.app_context():
        results = HospitalSearchProvider.search_naver(
            query="서울 중구 피부과",
            category="dermatology",
            limit=10,
        )

    assert len(results) == 1
    assert results[0]["source_url"] is None
    assert results[0]["homepage_url"] == "https://clinic.example.com"
    assert results[0]["map_url"] is None
    assert results[0]["naver_place_url"] is None
    assert results[0]["naver_place_id"] is None


def test_naver_oops_link_is_not_used_as_homepage(monkeypatch):
    app = Flask(__name__)
    app.config.update(
        NAVER_SEARCH_CLIENT_ID="client-id",
        NAVER_SEARCH_CLIENT_SECRET="client-secret",
        HOSPITAL_SEARCH_TIMEOUT_SECONDS=1,
    )

    monkeypatch.setattr(
        HospitalSearchProvider,
        "_get_json",
        staticmethod(
            lambda url, headers: {
                "items": [
                    {
                        "title": "예시피부과",
                        "category": "병원,의원",
                        "address": "서울 중구 예시로 1",
                        "roadAddress": "서울 중구 예시로 1",
                        "link": "https://youtube.com/oops",
                        "mapx": "1269840000",
                        "mapy": "375610000",
                    }
                ]
            },
        ),
    )

    with app.app_context():
        results = HospitalSearchProvider.search_naver(
            query="서울 중구 피부과",
            category="dermatology",
            limit=10,
        )

    assert len(results) == 1
    assert results[0]["source_url"] is None
    assert results[0]["homepage_url"] is None


def test_naver_search_loads_multiple_pages(monkeypatch):
    app = Flask(__name__)
    app.config.update(
        NAVER_SEARCH_CLIENT_ID="client-id",
        NAVER_SEARCH_CLIENT_SECRET="client-secret",
        HOSPITAL_SEARCH_TIMEOUT_SECONDS=1,
    )

    def fake_get_json(url, headers):
        params = parse_qs(urlparse(url).query)
        assert params["sort"] == ["comment"]
        start = int(params["start"][0])
        items = []
        for index in range(start, start + 5):
            items.append(
                {
                    "title": f"예시치과 {index}",
                    "category": "병원,의원",
                    "address": f"서울 강남구 예시로 {index}",
                    "roadAddress": f"서울 강남구 예시로 {index}",
                    "link": f"https://map.naver.com/p/entry/place/{10000 + index}",
                    "mapx": "1269840000",
                    "mapy": "375610000",
                }
            )
        return {"items": items}

    monkeypatch.setattr(HospitalSearchProvider, "_get_json", staticmethod(fake_get_json))

    with app.app_context():
        results = HospitalSearchProvider.search_naver(
            query="서울 강남구 치과",
            category="dentistry",
            limit=8,
        )

    assert len(results) == 8
    assert results[0]["source_provider"] == "naver"
    assert results[-1]["hospital_name"] == "예시치과 8"


def test_search_uses_broader_naver_query_before_kakao(monkeypatch):
    app = Flask(__name__)
    app.config.update(
        NAVER_SEARCH_CLIENT_ID="client-id",
        NAVER_SEARCH_CLIENT_SECRET="client-secret",
        KAKAO_REST_API_KEY="kakao-key",
        HOSPITAL_SEARCH_CACHE_TTL_SECONDS=0,
    )
    HospitalSearchProvider._CACHE.clear()

    seen_naver_queries = []

    def fake_naver_search(query, category=None, limit=10):
        seen_naver_queries.append(query)
        if query == "용인미르 치과":
            return [
                {
                    "id": "naver:1",
                    "provider": "naver",
                    "source_provider": "naver",
                    "hospital_name": "용인미르치과",
                    "category": "dentistry",
                    "address": "경기 용인시 예시로 1",
                    "road_address": "경기 용인시 예시로 1",
                    "source_name": "Naver",
                }
            ]
        return []

    monkeypatch.setattr(HospitalSearchProvider, "search_naver", staticmethod(fake_naver_search))
    monkeypatch.setattr(
        HospitalSearchProvider,
        "search_kakao",
        staticmethod(
            lambda **kwargs: [
                {
                    "id": "kakao:1",
                    "provider": "kakao",
                    "source_provider": "kakao",
                    "hospital_name": "용인미르 퍼스트치과의원",
                    "category": "dentistry",
                    "address": "경기 용인시 예시로 2",
                    "road_address": "경기 용인시 예시로 2",
                    "source_name": "Kakao",
                }
            ]
        ),
    )

    with app.app_context():
        results = HospitalSearchProvider.search(
            keyword="용인미르",
            category="dentistry",
            region="경기 용인시",
            limit=5,
        )

    assert "경기 용인시 용인미르 치과" in seen_naver_queries
    assert "용인미르 치과" in seen_naver_queries
    assert results[0]["source_provider"] == "naver"


def test_search_does_not_cache_kakao_only_result_when_naver_is_configured(monkeypatch):
    app = Flask(__name__)
    app.config.update(
        NAVER_SEARCH_CLIENT_ID="client-id",
        NAVER_SEARCH_CLIENT_SECRET="client-secret",
        KAKAO_REST_API_KEY="kakao-key",
        HOSPITAL_SEARCH_CACHE_TTL_SECONDS=300,
    )
    HospitalSearchProvider._CACHE.clear()

    monkeypatch.setattr(HospitalSearchProvider, "search_naver", staticmethod(lambda **kwargs: []))
    monkeypatch.setattr(
        HospitalSearchProvider,
        "search_kakao",
        staticmethod(
            lambda **kwargs: [
                {
                    "id": "kakao:1",
                    "provider": "kakao",
                    "source_provider": "kakao",
                    "hospital_name": "예시피부과",
                    "category": "dermatology",
                    "address": "서울 송파구 예시로 1",
                    "road_address": "서울 송파구 예시로 1",
                    "source_name": "Kakao",
                }
            ]
        ),
    )

    with app.app_context():
        results = HospitalSearchProvider.search(
            keyword="예시",
            category="dermatology",
            region="서울 송파구",
            limit=5,
        )

    assert results[0]["source_provider"] == "kakao"
    assert HospitalSearchProvider._CACHE == {}
