from datetime import timezone
from types import SimpleNamespace

import pytest
from flask import Flask
from flask_jwt_extended import JWTManager, create_access_token

from app.api.admin_api import admin_bp
from app.api.content_api import content_bp
from app.repositories.content_repository import ContentRepository
from app.repositories.member_repository import MemberRepository
from app.services.content_service import ContentService


@pytest.fixture
def app(monkeypatch):
    app = Flask(__name__)
    app.config.update(TESTING=True, JWT_SECRET_KEY="test-secret-key")
    JWTManager(app)
    app.register_blueprint(admin_bp, url_prefix="/api/admin")
    app.register_blueprint(content_bp, url_prefix="/api")
    members = {
        1: SimpleNamespace(id=1, role="admin", active=True, deleted_at=None),
        2: SimpleNamespace(id=2, role="user", active=True, deleted_at=None),
    }
    monkeypatch.setattr(MemberRepository, "get_by_id", staticmethod(lambda member_id: members.get(member_id)))
    return app


def auth(app, member_id):
    with app.app_context():
        return {"Authorization": f"Bearer {create_access_token(identity=str(member_id))}"}


@pytest.mark.parametrize("path", ["/api/admin/notices", "/api/admin/faqs"])
def test_admin_content_list_requires_admin(app, path):
    client = app.test_client()
    assert client.get(path).status_code == 401
    assert client.get(path, headers=auth(app, 2)).status_code == 403


def test_admin_notice_list_forwards_filters_and_pagination(app, monkeypatch):
    def fake_list(**kwargs):
        assert kwargs == {"keyword": "점검", "status": "PUBLISHED", "pinned": "true", "limit": 10, "offset": 10}
        return ([{"id": 1, "title": "점검 안내"}], 11)

    monkeypatch.setattr(ContentService, "list_admin_notices", staticmethod(fake_list))
    response = app.test_client().get(
        "/api/admin/notices?q=점검&status=PUBLISHED&pinned=true&page=2&per_page=10",
        headers=auth(app, 1),
    )
    assert response.status_code == 200
    assert response.get_json()["meta"] == {"page": 2, "per_page": 10, "count": 11}


def test_admin_notice_mutation_requires_admin(app, monkeypatch):
    monkeypatch.setattr(ContentService, "save_notice", staticmethod(lambda payload, admin_id, notice_id=None: {"id": 1}))
    client = app.test_client()
    assert client.post("/api/admin/notices", json={"title": "a", "content": "b"}).status_code == 401
    assert client.post("/api/admin/notices", headers=auth(app, 2), json={"title": "a", "content": "b"}).status_code == 403
    assert client.post("/api/admin/notices", headers=auth(app, 1), json={"title": "a", "content": "b"}).status_code == 201


def test_admin_notice_patch_and_faq_create_require_admin(app, monkeypatch):
    monkeypatch.setattr(ContentService, "save_notice", staticmethod(lambda payload, admin_id, notice_id=None: {"id": notice_id}))
    monkeypatch.setattr(ContentService, "save_faq", staticmethod(lambda payload, admin_id, faq_id=None: {"id": 1}))
    client = app.test_client()

    assert client.patch("/api/admin/notices/1", json={"title": "수정"}).status_code == 401
    assert client.patch("/api/admin/notices/1", headers=auth(app, 2), json={"title": "수정"}).status_code == 403
    assert client.patch("/api/admin/notices/1", headers=auth(app, 1), json={"title": "수정"}).status_code == 200
    assert client.post("/api/admin/faqs", headers=auth(app, 2), json={"question": "질문", "answer": "답변"}).status_code == 403
    assert client.post("/api/admin/faqs", headers=auth(app, 1), json={"question": "질문", "answer": "답변"}).status_code == 201


@pytest.mark.parametrize(
    "payload,message",
    [
        ({"title": "", "content": "내용"}, "title is required"),
        ({"title": "제목", "content": ""}, "content is required"),
        ({"title": "제목", "content": "내용", "status": "UNKNOWN"}, "Invalid content status"),
        ({"title": "제목", "content": "내용", "pinned": "true"}, "pinned must be a boolean"),
    ],
)
def test_notice_validation(payload, message):
    with pytest.raises(ValueError, match=message):
        ContentService._notice_data(payload)


def test_publishing_notice_sets_utc_timestamp(monkeypatch):
    item = SimpleNamespace(
        id=1, title=None, content=None, status="DRAFT", pinned=False, published_at=None,
        created_by=None, updated_by=None, created_at=None, updated_at=None,
    )
    def fake_create(data):
        for key, value in data.items():
            setattr(item, key, value)
        return item

    monkeypatch.setattr(ContentRepository, "create_notice", staticmethod(fake_create))
    monkeypatch.setattr("app.services.content_service.db.session.commit", lambda: None)
    monkeypatch.setattr("app.services.content_service.db.session.rollback", lambda: None)

    result = ContentService.save_notice(
        {"title": "서비스 점검", "content": "점검 안내입니다.", "status": "PUBLISHED", "pinned": True},
        admin_id=1,
    )

    assert result["status"] == "PUBLISHED"
    assert item.published_at is not None
    assert item.published_at.tzinfo is not None


@pytest.mark.parametrize(
    ("save_method", "repository_method", "payload", "item"),
    [
        (
            ContentService.save_notice,
            "get_notice",
            {"title": "수정된 공지"},
            SimpleNamespace(
                id=1, title="기존 공지", content="내용", status="DRAFT", pinned=False,
                published_at=None, created_by=1, updated_by=1, created_at=None, updated_at=None,
            ),
        ),
        (
            ContentService.save_faq,
            "get_faq",
            {"question": "수정된 질문"},
            SimpleNamespace(
                id=1, category="SERVICE", question="기존 질문", answer="답변", status="DRAFT",
                sort_order=0, published_at=None, created_at=None, updated_at=None,
            ),
        ),
    ],
)
def test_content_patch_updates_utc_timestamp(monkeypatch, save_method, repository_method, payload, item):
    monkeypatch.setattr(ContentRepository, repository_method, staticmethod(lambda item_id: item))
    monkeypatch.setattr("app.services.content_service.db.session.commit", lambda: None)
    monkeypatch.setattr("app.services.content_service.db.session.rollback", lambda: None)

    save_method(payload, admin_id=2, **({"notice_id": 1} if repository_method == "get_notice" else {"faq_id": 1}))

    assert item.updated_at is not None
    assert item.updated_at.tzinfo is timezone.utc


def test_public_notice_routes_are_anonymous_and_hide_admin_fields(app, monkeypatch):
    public_item = {"id": 1, "title": "공개 공지", "pinned": True, "publishedAt": "2026-07-29T00:00:00+00:00"}
    monkeypatch.setattr(ContentService, "list_public_notices", staticmethod(lambda limit=20, offset=0: ([public_item], 1)))
    monkeypatch.setattr(
        ContentService,
        "get_public_notice",
        staticmethod(lambda notice_id: {**public_item, "content": "<script>alert(1)</script>"}),
    )
    client = app.test_client()

    listing = client.get("/api/notices")
    detail = client.get("/api/notices/1")

    assert listing.status_code == 200
    assert detail.status_code == 200
    assert listing.get_json()["data"][0] == public_item
    assert "createdBy" not in str(detail.get_json())
    assert "updatedBy" not in str(detail.get_json())


def test_public_notice_service_queries_published_only(monkeypatch):
    seen = {}

    def fake_list(**kwargs):
        seen.update(kwargs)
        return ([], 0)

    monkeypatch.setattr(ContentRepository, "list_notices", staticmethod(fake_list))
    assert ContentService.list_public_notices(limit=5, offset=0) == ([], 0)
    assert seen == {"published_only": True, "limit": 5, "offset": 0}


def test_public_notice_detail_returns_404_for_non_published(app, monkeypatch):
    monkeypatch.setattr(ContentService, "get_public_notice", staticmethod(lambda notice_id: (_ for _ in ()).throw(LookupError("Notice not found"))))
    assert app.test_client().get("/api/notices/9").status_code == 404


def test_faq_validation():
    with pytest.raises(ValueError, match="question is required"):
        ContentService._faq_data({"question": "", "answer": "답변"})
    with pytest.raises(ValueError, match="sortOrder"):
        ContentService._faq_data({"question": "질문", "answer": "답변", "sortOrder": -1})
