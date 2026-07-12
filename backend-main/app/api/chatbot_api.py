from flask import Blueprint, g, request
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request

from app.services import ChatbotHistoryService, ChatbotService
from app.utils.pagination import build_pagination_meta, get_pagination_params
from app.utils.response import error_response, success_response
from app.utils.security import require_auth

chatbot_bp = Blueprint("chatbot", __name__)


@chatbot_bp.route("/message", methods=["POST"])
def create_chatbot_message():
    payload = request.get_json(silent=True) or {}
    member_id = _optional_member_id()

    try:
        return success_response(
            ChatbotService.answer(
                payload,
                member_id=member_id,
                allow_remote_ai=bool(member_id),
                rate_limit_key=f"member:{member_id}" if member_id else None,
            )
        )
    except ValueError as e:
        return error_response(str(e), 400)


@chatbot_bp.route("/conversations", methods=["GET"])
@require_auth
def list_chatbot_conversations():
    pagination = get_pagination_params(request.args)
    items, total = ChatbotHistoryService.list_conversations(
        g.current_member.id,
        limit=pagination["limit"],
        offset=pagination["offset"],
    )
    return success_response(items, meta=build_pagination_meta(pagination["page"], pagination["per_page"], total))


@chatbot_bp.route("/conversations/<int:conversation_id>", methods=["GET"])
@require_auth
def get_chatbot_conversation(conversation_id):
    try:
        return success_response(ChatbotHistoryService.get_conversation(g.current_member.id, conversation_id))
    except ValueError as e:
        return error_response(str(e), 404)


def _optional_member_id():
    try:
        verify_jwt_in_request(optional=True)
        return get_jwt_identity()
    except Exception:
        return None
