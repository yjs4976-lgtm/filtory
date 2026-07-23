from flask import Blueprint, g

from app.services import AnalysisUsageService
from app.utils.response import success_response
from app.utils.security import require_auth

membership_bp = Blueprint("membership", __name__)


@membership_bp.route("/me", methods=["GET"])
@require_auth
def get_my_membership():
    return success_response(AnalysisUsageService.get_entitlement(g.current_member.id))
