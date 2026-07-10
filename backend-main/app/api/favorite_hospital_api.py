from flask import Blueprint, g, request

from app.services import SavedHospitalService
from app.utils.response import error_response, success_response
from app.utils.security import require_auth

favorite_hospital_bp = Blueprint("favorite_hospitals", __name__)


@favorite_hospital_bp.route("", methods=["GET"])
@require_auth
def list_favorite_hospitals():
    try:
        page = int(request.args.get("page", 1))
        size = int(request.args.get("size", 6))
        items, total = SavedHospitalService.list_favorite_hospitals(
            g.current_member.id, page, size, request.args.get("category"),
            request.args.get("status"), request.args.get("sort", "latest"), request.args.get("keyword"),
        )
        return success_response(items, meta={"page": page, "size": size, "total": total, "totalPages": max(1, (total + size - 1) // size)})
    except (TypeError, ValueError) as error:
        return error_response(str(error), 400)


@favorite_hospital_bp.route("", methods=["POST"])
@require_auth
def add_favorite_hospital():
    try:
        item = SavedHospitalService.save_favorite_hospital(g.current_member.id, request.get_json(silent=True) or {})
        return success_response(item, "관심 병원에 추가했어요.", 201)
    except ValueError as error:
        status = 404 if str(error) == "Hospital not found" else 400
        return error_response(str(error), status)


@favorite_hospital_bp.route("/<int:hospital_id>", methods=["DELETE"])
@require_auth
def remove_favorite_hospital(hospital_id):
    try:
        SavedHospitalService.delete_saved_hospital(g.current_member.id, hospital_id)
        return success_response({"hospitalId": hospital_id, "isFavorite": False}, "관심 병원에서 삭제했어요.")
    except ValueError as error:
        return error_response(str(error), 404)
