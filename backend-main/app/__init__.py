from flask import Flask
from config import Config
from app.extensions import db, cors
from app.api.analysis_api import analysis_bp
from app.api.health_api import health_bp
from app.api.hospital_api import hospital_bp
from app.api.member_api import member_bp
from app.api.report_api import report_bp
from app.api.subscription_api import subscription_bp


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)
    cors.init_app(app, resources={r"/api/*": {"origins": "*"}})

    app.register_blueprint(health_bp, url_prefix="/api/health")
    app.register_blueprint(member_bp, url_prefix="/api/members")
    app.register_blueprint(hospital_bp, url_prefix="/api/hospitals")
    app.register_blueprint(analysis_bp, url_prefix="/api/analysis")
    app.register_blueprint(subscription_bp, url_prefix="/api/subscriptions")
    app.register_blueprint(report_bp, url_prefix="/api/reports")

    return app
