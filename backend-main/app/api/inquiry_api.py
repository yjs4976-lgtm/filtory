from io import BytesIO

from flask import Blueprint, g, request, send_file

from app.services import InquiryService
from app.utils.pagination import build_pagination_meta, get_pagination_params
from app.utils.response import error_response, success_response
from app.utils.security import require_auth

inquiry_bp = Blueprint("inquiries", __name__)


@inquiry_bp.route("/inquiries", methods=["POST"])
@require_auth
def create_inquiry():
    # 첨부파일이 있으면 multipart/form-data로 받고, 없으면 기존 JSON 문의 작성도 유지한다.
    if request.content_type and request.content_type.startswith("multipart/form-data"):
        payload = request.form.to_dict()
        attachment_file = request.files.get("attachment")
    else:
        payload = request.get_json(silent=True) or {}
        attachment_file = None

    try:
        inquiry = InquiryService.create_inquiry(g.current_member.id, payload, attachment_file=attachment_file)
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


@inquiry_bp.route("/inquiries/<int:inquiry_id>/attachment", methods=["GET"])
@require_auth
def download_inquiry_attachment(inquiry_id):
    try:
        # 첨부파일은 공개 URL로 열지 않고, 소유자 또는 관리자 검증 후 서버가 파일을 내려준다.
        attachment = InquiryService.get_attachment_for_member(g.current_member, inquiry_id)
        return send_file(
            BytesIO(attachment["content"]),
            mimetype=attachment["content_type"],
            as_attachment=True,
            download_name=attachment["file_name"],
        )
    except ValueError as e:
        return error_response(str(e), 404)
