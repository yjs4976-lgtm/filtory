from flask import Blueprint, g, request

from app.services import AdminService
from app.utils.pagination import build_pagination_meta, get_pagination_params
from app.utils.response import error_response, success_response
from app.utils.security import require_admin

admin_bp = Blueprint("admin", __name__)


@admin_bp.route("/summary", methods=["GET"])
@require_admin
def get_summary():
    return success_response(AdminService.get_summary())


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
