from flask import Blueprint, g, request

from app.clients.ai_review_ocr_client import AIReviewOcrClient
from app.services import AnalysisService
from app.utils.pagination import build_pagination_meta, get_pagination_params
from app.utils.response import error_response, success_response
from app.utils.security import require_admin, require_auth

analysis_bp = Blueprint("analysis", __name__)


def _current_member_is_admin():
    return str(getattr(g.current_member, "role", "") or "").lower() == "admin"


def _can_access_member(member_id):
    return _current_member_is_admin() or member_id == g.current_member.id


@analysis_bp.route("/analyze", methods=["POST"])
@require_auth
def analyze_reviews():
    payload = request.get_json(silent=True) or {}

    try:
        # 프론트는 backend-ai를 직접 호출하지 않고, 로그인된 회원 기준으로 backend-main 분석 API만 호출한다.
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
@require_auth
def list_analysis_requests():
    pagination = get_pagination_params(request.args)
    requested_member_id = request.args.get("member_id", type=int)
    requested_hospital_id = request.args.get("hospital_id", type=int)

    if not _current_member_is_admin():
        # 일반 회원은 member_id를 위조해도 자신의 분석 요청만 볼 수 있다.
        # hospital_id 필터는 본인 기록 안에서만 적용되므로 유지한다.
        if requested_member_id and requested_member_id != g.current_member.id:
            return error_response("Member permission is required", 403)
        requested_member_id = g.current_member.id

    requests = AnalysisService.list_requests(
        member_id=requested_member_id,
        hospital_id=requested_hospital_id,
        limit=pagination["limit"],
        offset=pagination["offset"],
    )

    return success_response(
        data=requests,
        meta=build_pagination_meta(pagination["page"], pagination["per_page"], len(requests)),
    )


@analysis_bp.route("/requests", methods=["POST"])
@require_auth
def create_analysis_request():
    payload = request.get_json(silent=True) or {}
    if not _current_member_is_admin() or not payload.get("member_id"):
        payload["member_id"] = g.current_member.id

    try:
        analysis_request = AnalysisService.create_request(payload)
        return success_response(analysis_request, "Analysis request created", 201)
    except ValueError as e:
        return error_response(str(e), 400)


@analysis_bp.route("/requests/<int:request_id>", methods=["GET"])
@require_auth
def get_analysis_request(request_id):
    try:
        analysis_request = AnalysisService.get_request(request_id)
        if not _can_access_member(analysis_request.get("member_id")):
            return error_response("Member permission is required", 403)
        return success_response(analysis_request)
    except ValueError as e:
        return error_response(str(e), 404)


@analysis_bp.route("/requests/<int:request_id>/status", methods=["PATCH"])
@require_admin
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
@require_auth
def get_analysis_result_by_request(request_id):
    try:
        analysis_request = AnalysisService.get_request(request_id)
        if not _can_access_member(analysis_request.get("member_id")):
            return error_response("Member permission is required", 403)
        result = AnalysisService.get_result_by_request(request_id)
        return success_response(result)
    except ValueError as e:
        return error_response(str(e), 404)


@analysis_bp.route("/results", methods=["POST"])
@require_admin
def create_analysis_result():
    payload = request.get_json(silent=True) or {}

    try:
        result = AnalysisService.create_result(payload)
        return success_response(result, "Analysis result created", 201)
    except ValueError as e:
        return error_response(str(e), 400)


@analysis_bp.route("/results/<int:result_id>", methods=["GET"])
@require_auth
def get_analysis_result(result_id):
    try:
        result = AnalysisService.get_result(result_id)
        if not _can_access_member(result.get("member_id")):
            return error_response("Member permission is required", 403)
        return success_response(result)
    except ValueError as e:
        return error_response(str(e), 404)
