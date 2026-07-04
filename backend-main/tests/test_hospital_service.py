from types import SimpleNamespace

import pytest

from app.repositories import HospitalRepository
from app.services.analysis_service import AnalysisService
from app.services.hospital_service import HospitalService


def test_existing_hospital_is_not_enriched_from_user_payload(monkeypatch):
    hospital = SimpleNamespace(
        id=1,
        hospital_name="예시피부과",
        category="dermatology",
        homepage_url=None,
        english_name=None,
        has_english_info=False,
        has_english_reviews=False,
        has_photos=False,
    )

    monkeypatch.setattr(HospitalRepository, "get_by_id", staticmethod(lambda hospital_id: hospital))

    result = HospitalService.get_or_create_hospital_for_analysis(
        {
            "hospital_id": 1,
            "hospital_name": "예시피부과",
            "category": "dermatology",
            "homepage_url": "https://clinic.example.com",
            "english_name": "Example Dermatology Clinic",
            "has_english_info": True,
            "has_english_reviews": True,
            "has_photos": True,
        }
    )

    assert result is hospital
    assert hospital.homepage_url is None
    assert hospital.english_name is None
    assert hospital.has_english_info is False
    assert hospital.has_english_reviews is False
    assert hospital.has_photos is False


def test_new_analysis_hospital_data_excludes_user_enrichment_fields():
    data = HospitalService._analysis_hospital_data(
        {
            "hospital_name": "예시피부과",
            "category": "dermatology",
            "address": "서울시 예시구",
            "homepage_url": "https://clinic.example.com",
            "english_name": "Example Dermatology Clinic",
            "has_english_info": True,
            "has_english_reviews": True,
            "has_photos": True,
        }
    )

    assert data["hospital_name"] == "예시피부과"
    assert data["address"] == "서울시 예시구"
    assert "homepage_url" not in data
    assert "english_name" not in data
    assert "has_english_info" not in data
    assert "has_english_reviews" not in data
    assert "has_photos" not in data


def test_enrichment_suggestion_data_keeps_user_values_pending():
    suggestion = AnalysisService._enrichment_suggestion_data(
        {
            "homepage_url": "https://clinic.example.com",
            "english_name": "Example Dermatology Clinic",
            "has_english_info": True,
            "has_english_reviews": True,
            "has_photos": True,
        },
        hospital_id=1,
        analysis_request_id=2,
        member_id=3,
    )

    assert suggestion == {
        "hospital_id": 1,
        "analysis_request_id": 2,
        "source_member_id": 3,
        "source_type": "user_input",
        "status": "pending",
        "suggested_english_name": "Example Dermatology Clinic",
        "suggested_homepage_url": "https://clinic.example.com",
        "suggested_has_english_info": True,
        "suggested_has_english_reviews": True,
        "suggested_has_photos": True,
    }


def test_enrichment_suggestion_ignores_empty_and_false_values():
    suggestion = AnalysisService._enrichment_suggestion_data(
        {
            "homepage_url": "",
            "english_name": "",
            "has_english_info": False,
            "has_english_reviews": False,
            "has_photos": False,
        },
        hospital_id=1,
        analysis_request_id=2,
        member_id=3,
    )

    assert suggestion is None


def test_enrichment_suggestion_uses_google_photo_signal():
    suggestion = AnalysisService._enrichment_suggestion_data(
        {
            "has_google_photos": True,
        },
        hospital_id=1,
        analysis_request_id=2,
        member_id=3,
    )

    assert suggestion["suggested_has_photos"] is True


def test_enrichment_suggestion_rejects_non_http_homepage_url():
    with pytest.raises(ValueError, match="Invalid homepage URL"):
        AnalysisService._enrichment_suggestion_data(
            {"homepage_url": "javascript:alert(1)"},
            hospital_id=1,
            analysis_request_id=2,
            member_id=3,
        )
