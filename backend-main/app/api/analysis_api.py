from flask import Blueprint, g, request

from app.clients.ai_review_ocr_client import AIReviewOcrClient
from app.services import AnalysisService
from app.utils.pagination import build_pagination_meta, get_pagination_params
from app.utils.response import error_response, success_response
from app.utils.security import require_auth

analysis_bp = Blueprint("analysis", __name__)


@analysis_bp.route("/analyze", methods=["POST"])
@require_auth
def analyze_reviews():
    payload = request.get_json(silent=True) or {}

    try:
        result = AnalysisService.analyze_reviews(g.current_member.id, payload)
        return success_response(result, "Review analysis complete", 201)
    except ValueError as e:
        return error_response(str(e), 400)
    except RuntimeError as e:
        return error_response(str(e), 502)


@analysis_bp.route("/reviews/ocr", methods=["POST"])
@require_auth
def extract_review_text_from_images():
    image_files = request.files.getlist("images")
    language = request.form.get("language") or "ko"

    try:
        result = AIReviewOcrClient.extract(image_files, language=language)
        return success_response(result, "Review text extracted")
    except ValueError as e:
        return error_response(str(e), 400)
    except RuntimeError as e:
        return error_response(str(e), 502)


@analysis_bp.route("/requests", methods=["GET"])
def list_analysis_requests():
    pagination = get_pagination_params(request.args)

    requests = AnalysisService.list_requests(
        member_id=request.args.get("member_id", type=int),
        hospital_id=request.args.get("hospital_id", type=int),
        limit=pagination["limit"],
        offset=pagination["offset"],
    )

    return success_response(
        data=requests,
        meta=build_pagination_meta(pagination["page"], pagination["per_page"], len(requests)),
    )


@analysis_bp.route("/requests", methods=["POST"])
def create_analysis_request():
    payload = request.get_json(silent=True) or {}

    try:
        analysis_request = AnalysisService.create_request(payload)
        return success_response(analysis_request, "Analysis request created", 201)
    except ValueError as e:
        return error_response(str(e), 400)


@analysis_bp.route("/requests/<int:request_id>", methods=["GET"])
def get_analysis_request(request_id):
    try:
        analysis_request = AnalysisService.get_request(request_id)
        return success_response(analysis_request)
    except ValueError as e:
        return error_response(str(e), 404)


@analysis_bp.route("/requests/<int:request_id>/status", methods=["PATCH"])
def update_analysis_request_status(request_id):
    payload = request.get_json(silent=True) or {}

    try:
        analysis_request = AnalysisService.update_request_status(
            request_id,
            payload.get("request_status"),
            error_message=payload.get("error_message"),
        )
        return success_response(analysis_request, "Analysis request status updated")
    except ValueError as e:
        return error_response(str(e), 400)


@analysis_bp.route("/requests/<int:request_id>/result", methods=["GET"])
def get_analysis_result_by_request(request_id):
    try:
        result = AnalysisService.get_result_by_request(request_id)
        return success_response(result)
    except ValueError as e:
        return error_response(str(e), 404)


@analysis_bp.route("/results", methods=["POST"])
def create_analysis_result():
    payload = request.get_json(silent=True) or {}

    try:
        result = AnalysisService.create_result(payload)
        return success_response(result, "Analysis result created", 201)
    except ValueError as e:
        return error_response(str(e), 400)


@analysis_bp.route("/results/<int:result_id>", methods=["GET"])
def get_analysis_result(result_id):
    try:
        result = AnalysisService.get_result(result_id)
        return success_response(result)
    except ValueError as e:
        return error_response(str(e), 404)
