from flask import Blueprint, g, request

from app.services import AdminService, InquiryService
from app.utils.pagination import build_pagination_meta, get_pagination_params
from app.utils.response import error_response, success_response
from app.utils.security import require_admin

admin_bp = Blueprint("admin", __name__)


@admin_bp.route("/summary", methods=["GET"])
@require_admin
def get_summary():
    return success_response(AdminService.get_summary())


def _paginated_admin_response(loader, **filters):
    pagination = get_pagination_params(request.args)
    items, total = loader(limit=pagination["limit"], offset=pagination["offset"], **filters)
    return success_response(
        data=items,
        meta=build_pagination_meta(pagination["page"], pagination["per_page"], total),
    )


@admin_bp.route("/analyses", methods=["GET"])
@require_admin
def list_analyses():
    try:
        return _paginated_admin_response(
            AdminService.list_analyses,
            keyword=request.args.get("q") or request.args.get("keyword"),
            status=request.args.get("status"),
            category=request.args.get("category"),
            analysis_type=request.args.get("analysisType"),
        )
    except ValueError as e:
        return error_response(str(e), 400)


@admin_bp.route("/errors", methods=["GET"])
@require_admin
def list_errors():
    try:
        return _paginated_admin_response(
            AdminService.list_errors,
            keyword=request.args.get("q") or request.args.get("keyword"),
            category=request.args.get("category"),
            analysis_type=request.args.get("analysisType"),
        )
    except ValueError as e:
        return error_response(str(e), 400)


@admin_bp.route("/usage", methods=["GET"])
@require_admin
def list_usage():
    try:
        return _paginated_admin_response(
            AdminService.list_usage_logs,
            keyword=request.args.get("q") or request.args.get("keyword"),
            usage_type=request.args.get("usageType"),
            period_key=request.args.get("periodKey"),
        )
    except ValueError as e:
        return error_response(str(e), 400)


@admin_bp.route("/audit-logs", methods=["GET"])
@require_admin
def list_audit_logs():
    try:
        return _paginated_admin_response(
            AdminService.list_audit_logs,
            keyword=request.args.get("q") or request.args.get("keyword"),
            action=request.args.get("action"),
            resource_type=request.args.get("resourceType") or request.args.get("resource"),
            admin_id=request.args.get("adminId"),
        )
    except ValueError as e:
        return error_response(str(e), 400)


@admin_bp.route("/inquiries", methods=["GET"])
@require_admin
def list_inquiries():
    pagination = get_pagination_params(request.args)

    try:
        inquiries, total = InquiryService.list_admin_inquiries(
            keyword=request.args.get("q") or request.args.get("keyword"),
            status=request.args.get("status"),
            category=request.args.get("category"),
            limit=pagination["limit"],
            offset=pagination["offset"],
        )
        return success_response(
            data=inquiries,
            meta=build_pagination_meta(pagination["page"], pagination["per_page"], total),
        )
    except ValueError as e:
        return error_response(str(e), 400)


@admin_bp.route("/inquiries/<int:inquiry_id>", methods=["GET"])
@require_admin
def get_inquiry(inquiry_id):
    try:
        return success_response(InquiryService.get_admin_inquiry(inquiry_id))
    except ValueError as e:
        return error_response(str(e), 404)


@admin_bp.route("/inquiries/<int:inquiry_id>/status", methods=["PATCH"])
@require_admin
def update_inquiry_status(inquiry_id):
    payload = request.get_json(silent=True) or {}

    try:
        inquiry = InquiryService.update_status(inquiry_id, payload.get("status"))
        return success_response(inquiry, "Inquiry status updated")
    except ValueError as e:
        return error_response(str(e), 400)


@admin_bp.route("/inquiries/<int:inquiry_id>/answers", methods=["POST"])
@require_admin
def save_inquiry_answer(inquiry_id):
    payload = request.get_json(silent=True) or {}

    try:
        inquiry = InquiryService.save_answer(inquiry_id, g.current_member.id, payload.get("content"))
        return success_response(inquiry, "Inquiry answer saved")
    except ValueError as e:
        return error_response(str(e), 400)


@admin_bp.route("/users", methods=["GET"])
@require_admin
def list_users():
    pagination = get_pagination_params(request.args)

    try:
        members = AdminService.list_members(
            keyword=request.args.get("q") or request.args.get("keyword"),
            status=request.args.get("status"),
            role=request.args.get("role"),
            limit=pagination["limit"],
            offset=pagination["offset"],
        )
        return success_response(
            data=members,
            meta=build_pagination_meta(pagination["page"], pagination["per_page"], len(members)),
        )
    except ValueError as e:
        return error_response(str(e), 400)


@admin_bp.route("/reviews", methods=["GET"])
@require_admin
def list_review_cases():
    pagination = get_pagination_params(request.args)

    try:
        review_cases, total = AdminService.list_review_cases(
            keyword=request.args.get("q") or request.args.get("keyword"),
            status=request.args.get("status"),
            case_type=request.args.get("caseType") or request.args.get("type"),
            limit=pagination["limit"],
            offset=pagination["offset"],
        )
        return success_response(
            data=review_cases,
            meta=build_pagination_meta(pagination["page"], pagination["per_page"], total),
        )
    except ValueError as e:
        return error_response(str(e), 400)


@admin_bp.route("/reviews/<int:case_id>/status", methods=["PATCH"])
@require_admin
def update_review_case_status(case_id):
    payload = request.get_json(silent=True) or {}

    try:
        review_case = AdminService.update_review_case_status(
            case_id,
            payload.get("status"),
            g.current_member.id,
            admin_memo=payload.get("adminMemo"),
        )
        return success_response(review_case, "Review case status updated")
    except ValueError as e:
        return error_response(str(e), 400)


@admin_bp.route("/hospitals", methods=["GET"])
@require_admin
def list_hospitals():
    pagination = get_pagination_params(request.args)

    try:
        hospitals, total = AdminService.list_hospitals(
            keyword=request.args.get("q") or request.args.get("keyword"),
            category=request.args.get("category"),
            status=request.args.get("status"),
            limit=pagination["limit"],
            offset=pagination["offset"],
        )
        return success_response(
            data=hospitals,
            meta=build_pagination_meta(pagination["page"], pagination["per_page"], total),
        )
    except ValueError as e:
        return error_response(str(e), 400)


@admin_bp.route("/hospitals/<int:hospital_id>", methods=["PATCH"])
@require_admin
def update_hospital(hospital_id):
    payload = request.get_json(silent=True) or {}

    try:
        hospital = AdminService.update_hospital(hospital_id, payload, g.current_member.id)
        return success_response(hospital, "Hospital updated")
    except ValueError as e:
        return error_response(str(e), 400)


@admin_bp.route("/users/<int:member_id>", methods=["GET"])
@require_admin
def get_user(member_id):
    try:
        return success_response(AdminService.get_member(member_id))
    except ValueError as e:
        return error_response(str(e), 404)


@admin_bp.route("/users/<int:member_id>/role", methods=["PATCH"])
@require_admin
def update_user_role(member_id):
    payload = request.get_json(silent=True) or {}

    try:
        member = AdminService.update_member_role(member_id, payload.get("role"), g.current_member.id)
        return success_response(member, "Member role updated")
    except ValueError as e:
        return error_response(str(e), 400)


@admin_bp.route("/users/<int:member_id>/status", methods=["PATCH"])
@require_admin
def update_user_status(member_id):
    payload = request.get_json(silent=True) or {}

    try:
        member = AdminService.update_member_status(member_id, payload.get("status"), g.current_member.id)
        return success_response(member, "Member status updated")
    except ValueError as e:
        return error_response(str(e), 400)


@admin_bp.route("/users/<int:member_id>", methods=["DELETE"])
@require_admin
def withdraw_user(member_id):
    try:
        AdminService.withdraw_member(member_id, g.current_member.id)
        return success_response(None, "Member withdrawn")
    except ValueError as e:
        return error_response(str(e), 400)
