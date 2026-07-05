from flask import Blueprint, g, request

from app.services import ReportService
from app.utils.pagination import build_pagination_meta, get_pagination_params
from app.utils.response import error_response, success_response
from app.utils.security import require_admin, require_auth

report_bp = Blueprint("reports", __name__)

REPORT_CREATE_MANAGED_FIELDS = {
    "admin_member_id",
    "adminMemberId",
    "admin_memo",
    "adminMemo",
    "admin_response",
    "adminResponse",
    "reporterMemberId",
    "resolved_at",
    "resolvedAt",
}


@report_bp.route("/", methods=["GET"])
@require_admin
def list_reports():
    pagination = get_pagination_params(request.args)

    try:
        reports = ReportService.list_reports(
            status=request.args.get("status"),
            limit=pagination["limit"],
            offset=pagination["offset"],
        )
        return success_response(
            data=reports,
            meta=build_pagination_meta(pagination["page"], pagination["per_page"], len(reports)),
        )
    except ValueError as e:
        return error_response(str(e), 400)


@report_bp.route("/", methods=["POST"])
@require_auth
def create_report():
    payload = request.get_json(silent=True) or {}
    for key in REPORT_CREATE_MANAGED_FIELDS:
        payload.pop(key, None)
    payload["reporter_member_id"] = g.current_member.id
    payload["status"] = "pending"

    try:
        report = ReportService.create_report(payload)
        return success_response(report, "Report created", 201)
    except ValueError as e:
        return error_response(str(e), 400)


@report_bp.route("/<int:report_id>", methods=["GET"])
@require_admin
def get_report(report_id):
    try:
        report = ReportService.get_report(report_id)
        return success_response(report)
    except ValueError as e:
        return error_response(str(e), 404)


@report_bp.route("/<int:report_id>", methods=["PATCH"])
@require_admin
def update_report(report_id):
    payload = request.get_json(silent=True) or {}

    try:
        report = ReportService.update_report(report_id, payload)
        return success_response(report, "Report updated")
    except ValueError as e:
        return error_response(str(e), 400)


@report_bp.route("/<int:report_id>/resolve", methods=["POST"])
@require_admin
def resolve_report(report_id):
    payload = request.get_json(silent=True) or {}

    try:
        report = ReportService.resolve_report(report_id, payload)
        return success_response(report, "Report resolved")
    except ValueError as e:
        return error_response(str(e), 400)
