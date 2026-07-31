from sqlalchemy import or_

from app.extensions import db
from app.models import AdminFaq, AdminNotice


class ContentRepository:
    @staticmethod
    def list_notices(keyword=None, status=None, pinned=None, published_only=False, limit=20, offset=0):
        query = AdminNotice.query
        if keyword:
            pattern = f"%{keyword.strip()}%"
            query = query.filter(or_(AdminNotice.title.ilike(pattern), AdminNotice.content.ilike(pattern)))
        if published_only:
            query = query.filter(AdminNotice.status == "PUBLISHED")
        elif status:
            query = query.filter(AdminNotice.status == status)
        if pinned is not None:
            query = query.filter(AdminNotice.pinned.is_(pinned))
        total = query.count()
        items = (
            query.order_by(AdminNotice.pinned.desc(), AdminNotice.published_at.desc().nullslast(), AdminNotice.id.desc())
            .limit(limit).offset(offset).all()
        )
        return items, total

    @staticmethod
    def get_notice(notice_id, published_only=False):
        query = AdminNotice.query.filter(AdminNotice.id == notice_id)
        if published_only:
            query = query.filter(AdminNotice.status == "PUBLISHED")
        return query.first()

    @staticmethod
    def create_notice(data):
        item = AdminNotice(**data)
        db.session.add(item)
        return item

    @staticmethod
    def list_faqs(keyword=None, status=None, category=None, published_only=False, limit=20, offset=0):
        query = AdminFaq.query
        if keyword:
            pattern = f"%{keyword.strip()}%"
            query = query.filter(or_(AdminFaq.question.ilike(pattern), AdminFaq.answer.ilike(pattern)))
        if published_only:
            query = query.filter(AdminFaq.status == "PUBLISHED")
        elif status:
            query = query.filter(AdminFaq.status == status)
        if category:
            query = query.filter(AdminFaq.category == category)
        total = query.count()
        items = query.order_by(AdminFaq.sort_order.asc(), AdminFaq.published_at.desc().nullslast(), AdminFaq.id.desc()).limit(limit).offset(offset).all()
        return items, total

    @staticmethod
    def get_faq(faq_id):
        return db.session.get(AdminFaq, faq_id)

    @staticmethod
    def create_faq(data):
        item = AdminFaq(**data)
        db.session.add(item)
        return item
