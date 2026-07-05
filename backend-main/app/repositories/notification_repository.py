from datetime import datetime, timezone

from app.extensions import db
from app.models import MemberNotification


class NotificationRepository:
    @staticmethod
    def create(data):
        notification = MemberNotification(**data)

        db.session.add(notification)
        return notification

    @staticmethod
    def get_by_id(notification_id):
        return db.session.get(MemberNotification, notification_id)

    @staticmethod
    def list_by_member(member_id, limit=20, offset=0):
        query = MemberNotification.query.filter(MemberNotification.member_id == member_id)
        total = query.count()
        items = (
            query.order_by(MemberNotification.created_at.desc())
            .limit(limit)
            .offset(offset)
            .all()
        )
        return items, total

    @staticmethod
    def count_unread(member_id):
        return (
            MemberNotification.query
            .filter(
                MemberNotification.member_id == member_id,
                MemberNotification.is_read.is_(False),
            )
            .count()
        )

    @staticmethod
    def mark_as_read(notification):
        notification.is_read = True
        notification.read_at = datetime.now(timezone.utc)
        return notification

    @staticmethod
    def mark_all_as_read(member_id):
        now = datetime.now(timezone.utc)
        return (
            MemberNotification.query
            .filter(
                MemberNotification.member_id == member_id,
                MemberNotification.is_read.is_(False),
            )
            .update(
                {
                    "is_read": True,
                    "read_at": now,
                },
                synchronize_session=False,
            )
        )
