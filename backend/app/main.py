from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings

settings = get_settings()

app = FastAPI(
    title="VYREN API",
    description="Competency Intelligence Platform — Backend API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS — allow configured frontend origin(s)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["System"])
async def health_check():
    """Health check endpoint — verifies the API is running."""
    return {
        "status": "healthy",
        "service": "vyren-backend",
        "environment": settings.environment,
    }


from app.api import admin, assessment, assistant, auth, competency, courses, igot, learner, system, trainer

app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(learner.router, prefix="/learner", tags=["Learner"])
app.include_router(competency.router, prefix="/competencies", tags=["Competencies"])
app.include_router(assessment.router, prefix="/assessments", tags=["Assessments"])
app.include_router(courses.router, prefix="/courses", tags=["Courses"])
app.include_router(admin.router, prefix="/admin", tags=["Admin"])
app.include_router(trainer.router, prefix="/trainer", tags=["Trainer"])
app.include_router(assistant.router, prefix="/assistant", tags=["AI Assistant"])
app.include_router(system.router, prefix="/system", tags=["System"])
app.include_router(igot.router, prefix="/igot", tags=["iGOT Karmayogi"])
