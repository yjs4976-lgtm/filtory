from types import SimpleNamespace

from app.services.hospital_service import HospitalService


def test_merge_hospital_enrichment_fills_missing_values():
    hospital = SimpleNamespace(
        hospital_name="예시피부과",
        category="dermatology",
        homepage_url=None,
        english_name=None,
        has_english_info=False,
        has_english_reviews=False,
        has_photos=False,
    )

    HospitalService._merge_hospital_enrichment(
        hospital,
        {
            "hospital_name": "다른 이름",
            "category": "dentistry",
            "homepage_url": "https://clinic.example.com",
            "english_name": "Example Dermatology Clinic",
            "has_english_info": True,
            "has_english_reviews": True,
            "has_photos": True,
        },
    )

    assert hospital.hospital_name == "예시피부과"
    assert hospital.category == "dermatology"
    assert hospital.homepage_url == "https://clinic.example.com"
    assert hospital.english_name == "Example Dermatology Clinic"
    assert hospital.has_english_info is True
    assert hospital.has_english_reviews is True
    assert hospital.has_photos is True


def test_merge_hospital_enrichment_does_not_overwrite_existing_values_or_clear_flags():
    hospital = SimpleNamespace(
        homepage_url="https://existing.example.com",
        english_name="Existing Clinic",
        has_english_info=True,
        has_english_reviews=True,
    )

    HospitalService._merge_hospital_enrichment(
        hospital,
        {
            "homepage_url": "https://new.example.com",
            "english_name": "New Clinic",
            "has_english_info": False,
            "has_english_reviews": False,
        },
    )

    assert hospital.homepage_url == "https://existing.example.com"
    assert hospital.english_name == "Existing Clinic"
    assert hospital.has_english_info is True
    assert hospital.has_english_reviews is True
