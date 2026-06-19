from flask import Blueprint, request

from app.services import HospitalService
from app.utils.pagination import build_pagination_meta, get_pagination_params
from app.utils.response import error_response, success_response

hospital_bp = Blueprint("hospitals", __name__)


@hospital_bp.route("/", methods=["GET"])
def list_hospitals():
    pagination = get_pagination_params(request.args)

    try:
        hospitals = HospitalService.list_hospitals(
            category=request.args.get("category"),
            region=request.args.get("region"),
            keyword=request.args.get("q"),
            limit=pagination["limit"],
            offset=pagination["offset"],
        )
        return success_response(
            data=hospitals,
            meta=build_pagination_meta(pagination["page"], pagination["per_page"], len(hospitals)),
        )
    except ValueError as e:
        return error_response(str(e), 400)


@hospital_bp.route("/", methods=["POST"])
def create_hospital():
    payload = request.get_json(silent=True) or {}

    try:
        hospital = HospitalService.create_hospital(payload)
        return success_response(hospital, "Hospital created", 201)
    except ValueError as e:
        return error_response(str(e), 400)


@hospital_bp.route("/<int:hospital_id>", methods=["GET"])
def get_hospital(hospital_id):
    try:
        hospital = HospitalService.get_hospital(hospital_id)
        return success_response(hospital)
    except ValueError as e:
        return error_response(str(e), 404)


@hospital_bp.route("/<int:hospital_id>", methods=["PATCH"])
def update_hospital(hospital_id):
    payload = request.get_json(silent=True) or {}

    try:
        hospital = HospitalService.update_hospital(hospital_id, payload)
        return success_response(hospital, "Hospital updated")
    except ValueError as e:
        return error_response(str(e), 400)
