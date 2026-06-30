from flask import Blueprint, request

from app.services import ChatbotService
from app.utils.response import error_response, success_response

chatbot_bp = Blueprint("chatbot", __name__)


@chatbot_bp.route("/message", methods=["POST"])
def create_chatbot_message():
    payload = request.get_json(silent=True) or {}

    try:
        return success_response(ChatbotService.answer(payload))
    except ValueError as e:
        return error_response(str(e), 400)
