from flask import Flask

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


def test_naver_external_link_is_not_used_as_place_or_map_url(monkeypatch):
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
    assert results[0]["source_url"] == "https://clinic.example.com"
    assert results[0]["map_url"] is None
    assert results[0]["naver_place_url"] is None
    assert results[0]["naver_place_id"] is None
