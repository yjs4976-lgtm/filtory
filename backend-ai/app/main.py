from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.chatbot_api import router as chatbot_router
from app.api.review_analysis_api import router as review_analysis_router

# FastAPI 인스턴스는 backend-ai의 ASGI 애플리케이션 진입점이다.
app = FastAPI(
    title="Filtory AI Server",
    description="AI review analysis server for Filtory",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# APIRouter를 include_router로 붙이면 파일별 API 모듈을 하나의 FastAPI app으로 합칠 수 있다.
app.include_router(review_analysis_router)
app.include_router(chatbot_router)


@app.get("/api/health")
def health_check():
    return {
        "success": True,
        "message": "Filtory backend-ai is running"
    }
