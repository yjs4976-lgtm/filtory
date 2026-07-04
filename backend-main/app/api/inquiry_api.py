from flask import Blueprint, g, request

from app.services import InquiryService
from app.utils.pagination import build_pagination_meta, get_pagination_params
from app.utils.response import error_response, success_response
from app.utils.security import require_auth

inquiry_bp = Blueprint("inquiries", __name__)


@inquiry_bp.route("/inquiries", methods=["POST"])
@require_auth
def create_inquiry():
    payload = request.get_json(silent=True) or {}

    try:
        inquiry = InquiryService.create_inquiry(g.current_member.id, payload)
        return success_response(inquiry, "Inquiry created", 201)
    except ValueError as e:
        return error_response(str(e), 400)


@inquiry_bp.route("/me/inquiries", methods=["GET"])
@require_auth
def list_my_inquiries():
    pagination = get_pagination_params(request.args)

    inquiries, total = InquiryService.list_my_inquiries(
        g.current_member.id,
        limit=pagination["limit"],
        offset=pagination["offset"],
    )
    return success_response(
        data=inquiries,
        meta=build_pagination_meta(pagination["page"], pagination["per_page"], total),
    )


@inquiry_bp.route("/inquiries/<int:inquiry_id>", methods=["GET"])
@require_auth
def get_my_inquiry(inquiry_id):
    try:
        inquiry = InquiryService.get_my_inquiry(g.current_member.id, inquiry_id)
        return success_response(inquiry)
    except ValueError as e:
        return error_response(str(e), 404)
