from flask import Flask
from config import Config
from app.extensions import db, cors
from app.api.health_api import health_bp


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)
    cors.init_app(app, resources={r"/api/*": {"origins": "*"}})

    app.register_blueprint(health_bp, url_prefix="/api/health")

    return app