from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.chatbot_api import router as chatbot_router
from app.api.review_analysis_api import router as review_analysis_router

# backend-ai는 브라우저가 직접 호출하는 공개 API가 아니라 backend-main의 내부
# 분석 의존성이다. 각 업무 endpoint는 별도의 내부 토큰 검증을 반드시 유지한다.
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

# 도메인별 router에서 인증·오류 변환을 수행하고, app 진입점은 조립만 담당한다.
app.include_router(review_analysis_router)
app.include_router(chatbot_router)


@app.get("/api/health")
def health_check():
    return {
        "success": True,
        "message": "Filtory backend-ai is running"
    }
