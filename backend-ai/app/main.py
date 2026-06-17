from fastapi import FastAPI

app = FastAPI(
    title="Filtory AI Server",
    description="AI review analysis server for Filtory",
    version="0.1.0",
)


@app.get("/api/health")
def health_check():
    return {
        "success": True,
        "message": "Filtory backend-ai is running"
    }
