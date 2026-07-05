def _isoformat(value):
    return value.isoformat() if value else None


UI_NOTIFICATION_TYPES = {
    "analysis": "analysis_done",
    "inquiry": "review_resolved",
    "report": "review_resolved",
    "saved_hospital": "info_updated",
    "security": "security",
    "marketing": "system",
    "system": "system",
}


def notification_to_dict(notification):
    if notification is None:
        return None

    metadata = notification.metadata_json if isinstance(notification.metadata_json, dict) else {}

    return {
        "id": notification.id,
        "type": UI_NOTIFICATION_TYPES.get(notification.notification_type, "system"),
        "notificationType": notification.notification_type,
        "title": notification.title,
        "message": notification.message,
        "link": notification.link_url,
        "isRead": bool(notification.is_read),
        "readAt": _isoformat(notification.read_at),
        "createdAt": _isoformat(notification.created_at),
        "metadata": metadata,
    }
