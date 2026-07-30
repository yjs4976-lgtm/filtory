from flask import Blueprint, request

from app.services import ContentService
from app.utils.pagination import build_pagination_meta, get_pagination_params
from app.utils.response import error_response, success_response

content_bp = Blueprint("content", __name__)


@content_bp.route("/notices", methods=["GET"])
def list_notices():
    pagination = get_pagination_params(request.args)
    items, total = ContentService.list_public_notices(limit=pagination["limit"], offset=pagination["offset"])
    return success_response(items, meta=build_pagination_meta(pagination["page"], pagination["per_page"], total))


@content_bp.route("/notices/featured", methods=["GET"])
def featured_notice():
    items, _ = ContentService.list_public_notices(limit=1)
    return success_response(items[0] if items else None)


@content_bp.route("/notices/<int:notice_id>", methods=["GET"])
def notice_detail(notice_id):
    try:
        return success_response(ContentService.get_public_notice(notice_id))
    except LookupError as e:
        return error_response(str(e), 404)

