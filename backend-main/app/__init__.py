from flask import Flask
from config import Config
from app.extensions import db, cors, jwt
from app.api.analysis_api import analysis_bp
from app.api.admin_api import admin_bp
from app.api.auth_api import auth_bp
from app.api.chatbot_api import chatbot_bp
from app.api.health_api import health_bp
from app.api.hospital_api import hospital_bp
from app.api.member_api import member_bp
from app.api.report_api import report_bp
from app.api.social_auth_api import social_auth_bp
from app.api.subscription_api import subscription_bp
from app.services import TokenService
from app.utils.response import error_response


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)
    cors.init_app(
        app,
        resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}},
        supports_credentials=True,
    )
    jwt.init_app(app)

    @jwt.token_in_blocklist_loader
    def check_if_token_revoked(jwt_header, jwt_payload):
        return TokenService.is_token_revoked(jwt_payload["jti"])

    @jwt.unauthorized_loader
    def handle_missing_token(reason):
        return error_response(reason, 401)

    @jwt.invalid_token_loader
    def handle_invalid_token(reason):
        return error_response(reason, 422)

    @jwt.expired_token_loader
    def handle_expired_token(jwt_header, jwt_payload):
        return error_response("Token has expired", 401)

    @jwt.revoked_token_loader
    def handle_revoked_token(jwt_header, jwt_payload):
        return error_response("Token has been revoked", 401)

    app.register_blueprint(health_bp, url_prefix="/api/health")
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(chatbot_bp, url_prefix="/api/chatbot")
    app.register_blueprint(social_auth_bp, url_prefix="/api/social-auth")
    app.register_blueprint(member_bp, url_prefix="/api/members")
    app.register_blueprint(hospital_bp, url_prefix="/api/hospitals")
    app.register_blueprint(analysis_bp, url_prefix="/api/analysis")
    app.register_blueprint(admin_bp, url_prefix="/api/admin")
    app.register_blueprint(subscription_bp, url_prefix="/api/subscriptions")
    app.register_blueprint(report_bp, url_prefix="/api/reports")

    return app
