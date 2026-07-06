from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_jwt_extended import JWTManager

# Flask 확장은 전역 객체만 먼저 만들고 create_app()에서 init_app()으로 연결한다.
# 이 패턴을 쓰면 모델/서비스 파일이 app 객체를 직접 import하지 않아도 된다.
db = SQLAlchemy()
cors = CORS()
jwt = JWTManager()
