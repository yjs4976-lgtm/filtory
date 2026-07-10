from flask import Blueprint, g, request

from app.services import RecentHospitalService
from app.utils.response import error_response, success_response
from app.utils.security import require_auth

recent_hospital_bp = Blueprint("recent_hospitals", __name__)


@recent_hospital_bp.route("", methods=["GET"])
@require_auth
def list_recent_hospitals():
    try:
        page, size = int(request.args.get("page", 1)), int(request.args.get("size", 20))
        items, total = RecentHospitalService.list(g.current_member.id, page, size)
        return success_response(items, meta={"page": page, "size": size, "total": total})
    except (TypeError, ValueError) as error:
        return error_response(str(error), 400)


@recent_hospital_bp.route("", methods=["DELETE"])
@require_auth
def clear_recent_hospitals():
    RecentHospitalService.clear(g.current_member.id)
    return success_response({"success": True})


@recent_hospital_bp.route("/<int:hospital_id>", methods=["POST"])
@require_auth
def record_recent_hospital(hospital_id):
    try:
        payload = request.get_json(silent=True) or {}
        return success_response(RecentHospitalService.record(g.current_member.id, hospital_id, payload.get("analysisResultId")))
    except ValueError as error:
        return error_response(str(error), 404)


@recent_hospital_bp.route("/<int:hospital_id>", methods=["DELETE"])
@require_auth
def remove_recent_hospital(hospital_id):
    try:
        RecentHospitalService.remove(g.current_member.id, hospital_id)
        return success_response({"hospitalId": hospital_id})
    except ValueError as error:
        return error_response(str(error), 404)
