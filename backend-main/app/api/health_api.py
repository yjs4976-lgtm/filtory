from flask import Blueprint, jsonify
from sqlalchemy import text
from app.extensions import db

health_bp = Blueprint("health", __name__)


@health_bp.route("/", methods=["GET"])
def health_check():
    return jsonify({
        "success": True,
        "message": "Filtory backend-main is running"
    }), 200


@health_bp.route("/db", methods=["GET"])
def db_health_check():
    try:
        result = db.session.execute(text("select 1 as ok")).fetchone()

        return jsonify({
            "success": True,
            "message": "Database connection success",
            "data": {
                "ok": result.ok
            }
        }), 200

    except Exception as e:
        return jsonify({
            "success": False,
            "message": "Database connection failed",
            "error": str(e)
        }), 500