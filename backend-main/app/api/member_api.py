from flask import Blueprint, g, request
from flask_jwt_extended import get_jwt

from app.services import AnalysisService, AuthService, MemberService, ProfileImageService, SavedHospitalService
from app.utils.pagination import build_pagination_meta, get_pagination_params
from app.utils.response import auth_success_response, error_response, success_response
from app.utils.security import require_admin, require_member_or_admin

member_bp = Blueprint("members", __name__)


@member_bp.route("/", methods=["GET"])
@require_admin
def list_members():
    pagination = get_pagination_params(request.args)
    members = MemberService.list_active_members(
        limit=pagination["limit"],
        offset=pagination["offset"],
    )

    return success_response(
        data=members,
        meta=build_pagination_meta(pagination["page"], pagination["per_page"], len(members)),
    )


@member_bp.route("/", methods=["POST"])
@require_admin
def create_member():
    payload = request.get_json(silent=True) or {}

    try:
        member = MemberService.create_member(payload)
        return success_response(member, "Member created", 201)
    except ValueError as e:
        return error_response(str(e), 400)


@member_bp.route("/<int:member_id>", methods=["GET"])
@require_member_or_admin
def get_member(member_id):
    try:
        member = MemberService.get_member(member_id)
        return success_response(member)
    except ValueError as e:
        return error_response(str(e), 404)


@member_bp.route("/<int:member_id>", methods=["PATCH"])
@require_member_or_admin
def update_member(member_id):
    payload = request.get_json(silent=True) or {}

    try:
        member = MemberService.update_member(member_id, payload)
        return success_response(member, "Member updated")
    except ValueError as e:
        return error_response(str(e), 400)


@member_bp.route("/<int:member_id>/password", methods=["PATCH"])
@require_member_or_admin
def change_member_password(member_id):
    payload = request.get_json(silent=True) or {}

    if g.current_member.id != member_id:
        return error_response("Member permission is required", 403)

    try:
        result = MemberService.change_password(
            member_id,
            payload.get("currentPassword") or payload.get("current_password"),
            payload.get("newPassword") or payload.get("new_password") or payload.get("password"),
        )
        return success_response(result, "Password changed")
    except ValueError as e:
        return error_response(str(e), 400)


@member_bp.route("/<int:member_id>/profile-image", methods=["POST"])
@require_member_or_admin
def upload_profile_image(member_id):
    try:
        member = ProfileImageService.upload(member_id, request.files.get("image"))
        return success_response(member, "Profile image uploaded")
    except ValueError as e:
        return error_response(str(e), 400)


@member_bp.route("/<int:member_id>/profile-image", methods=["DELETE"])
@require_member_or_admin
def delete_profile_image(member_id):
    try:
        member = ProfileImageService.remove(member_id)
        return success_response(member, "Profile image removed")
    except ValueError as e:
        return error_response(str(e), 400)


@member_bp.route("/<int:member_id>", methods=["DELETE"])
@require_member_or_admin
def deactivate_member(member_id):
    payload = request.get_json(silent=True) or {}

    try:
        member = MemberService.deactivate_member(
            member_id,
            password=payload.get("password"),
            requester=g.current_member,
            fresh_auth=bool(get_jwt().get("fresh")),
        )
        return success_response(member, "Member deactivated")
    except ValueError as e:
        return error_response(str(e), 400)


@member_bp.route("/find-email", methods=["POST"])
def find_member_emails():
    payload = request.get_json(silent=True) or {}

    try:
        emails = MemberService.find_member_emails(payload)
        return success_response(emails)
    except ValueError as e:
        return error_response(str(e), 400)


@member_bp.route("/nickname-check", methods=["GET"])
def check_nickname():
    return success_response(MemberService.check_nickname_available(request.args.get("nickname")))


@member_bp.route("/login-id-check", methods=["GET"])
def check_login_id():
    return success_response(MemberService.check_login_id_available(request.args.get("login_id")))


@member_bp.route("/<int:member_id>/analysis-history", methods=["GET"])
@require_member_or_admin
def list_member_analysis_history(member_id):
    pagination = get_pagination_params(request.args)
    history = AnalysisService.list_member_history(
        member_id,
        limit=pagination["limit"],
        offset=pagination["offset"],
    )
    return success_response(
        data=history,
        meta=build_pagination_meta(pagination["page"], pagination["per_page"], len(history)),
    )


@member_bp.route("/<int:member_id>/analysis-history/trash", methods=["GET"])
@require_member_or_admin
def list_member_analysis_history_trash(member_id):
    pagination = get_pagination_params(request.args)
    history = AnalysisService.list_member_history(
        member_id,
        limit=pagination["limit"],
        offset=pagination["offset"],
        trashed=True,
    )
    return success_response(
        data=history,
        meta=build_pagination_meta(pagination["page"], pagination["per_page"], len(history)),
    )


@member_bp.route("/<int:member_id>/analysis-history/trash", methods=["POST"])
@require_member_or_admin
def move_member_analysis_history_to_trash(member_id):
    payload = request.get_json(silent=True) or {}

    try:
        return success_response(
            AnalysisService.move_member_history_to_trash(
                member_id,
                payload.get("ids"),
                deleted_by_member_id=g.current_member.id,
            ),
            "Analysis history moved to trash",
        )
    except ValueError as e:
        return error_response(str(e), 404)


@member_bp.route("/<int:member_id>/analysis-history/trash/restore", methods=["POST"])
@require_member_or_admin
def restore_member_analysis_history(member_id):
    payload = request.get_json(silent=True) or {}

    try:
        return success_response(
            AnalysisService.restore_member_history(member_id, payload.get("ids")),
            "Analysis history restored",
        )
    except ValueError as e:
        return error_response(str(e), 404)


@member_bp.route("/<int:member_id>/analysis-history/trash", methods=["DELETE"])
@require_member_or_admin
def permanently_delete_member_analysis_history(member_id):
    payload = request.get_json(silent=True) or {}

    try:
        return success_response(
            AnalysisService.permanently_delete_member_history(member_id, payload.get("ids")),
            "Analysis history permanently deleted",
        )
    except ValueError as e:
        return error_response(str(e), 404)


@member_bp.route("/<int:member_id>/analysis-history/<int:request_id>", methods=["DELETE"])
@require_member_or_admin
def delete_member_analysis_history(member_id, request_id):
    try:
        return success_response(
            AnalysisService.delete_member_history(member_id, request_id),
            "Analysis history moved to trash",
        )
    except ValueError as e:
        return error_response(str(e), 404)


@member_bp.route("/<int:member_id>/saved-hospitals", methods=["GET"])
@require_member_or_admin
def list_saved_hospitals(member_id):
    pagination = get_pagination_params(request.args)
    saved_hospitals = SavedHospitalService.list_saved_hospitals(
        member_id,
        limit=pagination["limit"],
        offset=pagination["offset"],
    )
    return success_response(
        data=saved_hospitals,
        meta=build_pagination_meta(pagination["page"], pagination["per_page"], len(saved_hospitals)),
    )


@member_bp.route("/<int:member_id>/saved-hospitals", methods=["POST"])
@require_member_or_admin
def save_hospital(member_id):
    payload = request.get_json(silent=True) or {}
    try:
        saved_hospital = SavedHospitalService.save_hospital(member_id, payload)
        return success_response(saved_hospital, "Hospital saved", 201)
    except ValueError as e:
        return error_response(str(e), 400)


@member_bp.route("/<int:member_id>/saved-hospitals/<int:hospital_id>", methods=["DELETE"])
@require_member_or_admin
def delete_saved_hospital(member_id, hospital_id):
    try:
        return success_response(
            SavedHospitalService.delete_saved_hospital(member_id, hospital_id),
            "Saved hospital deleted",
        )
    except ValueError as e:
        return error_response(str(e), 404)


@member_bp.route("/find-id", methods=["POST"])
def find_member_id():
    payload = request.get_json(silent=True) or {}

    try:
        return success_response(MemberService.find_member_id(payload))
    except ValueError as e:
        return error_response(str(e), 400)


@member_bp.route("/password-reset/request", methods=["POST"])
def request_password_reset():
    payload = request.get_json(silent=True) or {}

    try:
        result = AuthService.request_password_reset(
            payload,
            request_ip=request.remote_addr,
            user_agent=request.headers.get("User-Agent"),
        )
        return success_response(result, "Password reset requested")
    except ValueError as e:
        return error_response(str(e), 400)


@member_bp.route("/password-reset/confirm", methods=["POST"])
def reset_password():
    payload = request.get_json(silent=True) or {}

    try:
        result = MemberService.reset_password(payload)
        return success_response(result, "Password reset complete")
    except ValueError as e:
        return error_response(str(e), 400)


@member_bp.route("/social-login", methods=["POST"])
def social_login():
    payload = request.get_json(silent=True) or {}

    try:
        result = AuthService.social_login(payload)
        return auth_success_response(result, "Social login complete")
    except ValueError as e:
        return error_response(str(e), 400)
