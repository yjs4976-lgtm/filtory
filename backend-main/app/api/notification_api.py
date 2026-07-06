from flask import Blueprint, g, request

from app.services import NotificationService
from app.utils.pagination import build_pagination_meta, get_pagination_params
from app.utils.response import error_response, success_response
from app.utils.security import require_auth

notification_bp = Blueprint("notifications", __name__)


@notification_bp.route("", methods=["GET"])
@require_auth
def list_notifications():
    # 알림 API는 URL에 member_id를 받지 않고 항상 현재 로그인 회원 기준으로 동작한다.
    pagination = get_pagination_params(request.args)
    notifications, total = NotificationService.list_my_notifications(
        g.current_member.id,
        limit=pagination["limit"],
        offset=pagination["offset"],
    )
    return success_response(
        data=notifications,
        meta=build_pagination_meta(pagination["page"], pagination["per_page"], total),
    )


@notification_bp.route("/unread-count", methods=["GET"])
@require_auth
def get_unread_notification_count():
    return success_response({"count": NotificationService.unread_count(g.current_member.id)})


@notification_bp.route("/read-all", methods=["PATCH"])
@require_auth
def mark_all_notifications_as_read():
    return success_response(NotificationService.mark_all_as_read(g.current_member.id))


@notification_bp.route("/<int:notification_id>/read", methods=["PATCH"])
@require_auth
def mark_notification_as_read(notification_id):
    try:
        return success_response(NotificationService.mark_as_read(g.current_member.id, notification_id))
    except ValueError as e:
        return error_response(str(e), 404)
