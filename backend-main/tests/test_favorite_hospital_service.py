from types import SimpleNamespace

from app.repositories import HospitalRepository
from app.services import SavedHospitalService


def test_external_favorite_uses_provider_and_external_place_id(monkeypatch):
    existing = SimpleNamespace(id=41)
    captured = {}

    def find(provider, external_place_id):
        captured.update(provider=provider, external_place_id=external_place_id)
        return existing

    monkeypatch.setattr(HospitalRepository, "get_by_source_provider_external_place_id", staticmethod(find))

    result = SavedHospitalService._upsert_external_hospital({
        "provider": "kakao", "externalPlaceId": "place-41", "name": "Example Clinic",
        "category": "orthopedics", "address": "Seoul",
    })

    assert result is existing
    assert captured == {"provider": "kakao", "external_place_id": "place-41"}


def test_external_favorite_passes_upserted_internal_id_to_existing_save_flow(monkeypatch):
    captured = {}
    monkeypatch.setattr(SavedHospitalService, "_upsert_external_hospital", staticmethod(lambda payload: SimpleNamespace(id=77)))

    def save(member_id, payload):
        captured.update(member_id=member_id, payload=payload)
        return {"id": payload["hospitalId"]}

    monkeypatch.setattr(SavedHospitalService, "save_hospital", staticmethod(save))
    result = SavedHospitalService.save_favorite_hospital(9, {"hospital": {"name": "Example Clinic"}})

    assert result == {"id": 77}
    assert captured["member_id"] == 9
    assert captured["payload"]["hospitalId"] == 77
