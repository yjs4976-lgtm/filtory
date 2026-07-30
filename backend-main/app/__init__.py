from flask import Flask
from config import Config
from app.extensions import db, cors, jwt
from app.api.analysis_api import analysis_bp
from app.api.admin_api import admin_bp
from app.api.auth_api import auth_bp
from app.api.chatbot_api import chatbot_bp
from app.api.content_api import content_bp
from app.api.health_api import health_bp
from app.api.hospital_api import hospital_bp
from app.api.inquiry_api import inquiry_bp
from app.api.member_api import member_bp
from app.api.membership_api import membership_bp
from app.api.notification_api import notification_bp
from app.api.report_api import report_bp
from app.api.social_auth_api import social_auth_bp
from app.api.subscription_api import subscription_bp
from app.api.favorite_hospital_api import favorite_hospital_bp
from app.api.recent_hospital_api import recent_hospital_bp
from app.services import TokenService
from app.utils.response import error_response


def create_app():
    # Flask 앱 팩토리 패턴이다. 테스트/운영에서 같은 설정으로 새 app 인스턴스를 만들 수 있다.
    app = Flask(__name__)
    app.config.from_object(Config)

    # Flask 확장 객체는 extensions.py에서 먼저 만들고, 여기서 실제 app에 연결한다.
    # 이렇게 하면 순환 import를 줄이고 테스트 app도 쉽게 만들 수 있다.
    db.init_app(app)
    cors.init_app(
        app,
        resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}},
        supports_credentials=True,
    )
    jwt.init_app(app)

    # flask-jwt-extended가 토큰을 검증할 때마다 호출하는 blocklist hook이다.
    @jwt.token_in_blocklist_loader
    def check_if_token_revoked(jwt_header, jwt_payload):
        return TokenService.is_token_revoked(jwt_payload["jti"])

    # JWT 에러 handler는 Flask 응답 형식에 맞춰 모두 JSON error_response로 통일한다.
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

    # Blueprint는 Flask에서 라우트 묶음을 모듈 단위로 등록하는 방식이다.
    # 각 *_bp는 자기 파일에서 endpoint를 정의하고 여기서 URL prefix를 붙인다.
    app.register_blueprint(health_bp, url_prefix="/api/health")
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(chatbot_bp, url_prefix="/api/chatbot")
    app.register_blueprint(content_bp, url_prefix="/api")
    app.register_blueprint(social_auth_bp, url_prefix="/api/social-auth")
    app.register_blueprint(member_bp, url_prefix="/api/members")
    app.register_blueprint(membership_bp, url_prefix="/api/membership")
    app.register_blueprint(notification_bp, url_prefix="/api/notifications")
    app.register_blueprint(hospital_bp, url_prefix="/api/hospitals")
    app.register_blueprint(inquiry_bp, url_prefix="/api")
    app.register_blueprint(analysis_bp, url_prefix="/api/analysis")
    app.register_blueprint(admin_bp, url_prefix="/api/admin")
    app.register_blueprint(subscription_bp, url_prefix="/api/subscriptions")
    app.register_blueprint(report_bp, url_prefix="/api/reports")
    app.register_blueprint(favorite_hospital_bp, url_prefix="/api/favorite-hospitals")
    app.register_blueprint(recent_hospital_bp, url_prefix="/api/recent-hospitals")

    return app
