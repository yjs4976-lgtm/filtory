from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.chatbot_api import router as chatbot_router
from app.api.review_analysis_api import router as review_analysis_router

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

app.include_router(review_analysis_router)
app.include_router(chatbot_router)


@app.get("/api/health")
def health_check():
    return {
        "success": True,
        "message": "Filtory backend-ai is running"
    }
