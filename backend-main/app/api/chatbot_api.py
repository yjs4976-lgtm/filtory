from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request

from app.services import ChatbotService
from app.utils.response import error_response, success_response

chatbot_bp = Blueprint("chatbot", __name__)


@chatbot_bp.route("/message", methods=["POST"])
def create_chatbot_message():
    payload = request.get_json(silent=True) or {}
    member_id = _optional_member_id()

    try:
        return success_response(
            ChatbotService.answer(
                payload,
                allow_remote_ai=bool(member_id),
                rate_limit_key=f"member:{member_id}" if member_id else None,
            )
        )
    except ValueError as e:
        return error_response(str(e), 400)


def _optional_member_id():
    try:
        verify_jwt_in_request(optional=True)
        return get_jwt_identity()
    except Exception:
        return None
