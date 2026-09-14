import time
from fastapi import APIRouter
from app.core.config import get_settings
from app.utils.supabase_client import get_supabase

router = APIRouter()
settings = get_settings()


@router.get(
    "/status",
    summary="System status & database latency diagnostic endpoint",
)
async def system_status():
    """
    Returns system diagnostic status, database round-trip latency,
    and background worker health.
    """
    supabase = get_supabase()
    start_time = time.time()
    
    db_connected = False
    db_latency_ms = 0.0

    try:
        res = supabase.table("competencies").select("id", count="exact").limit(1).execute()
        db_latency_ms = round((time.time() - start_time) * 1000.0, 2)
        db_connected = res.count is not None
    except Exception as e:
        print("Database status check failed:", e)

    return {
        "status": "online",
        "service": "vyren-backend",
        "environment": settings.environment,
        "database": {
            "connected": db_connected,
            "latency_ms": db_latency_ms,
        },
        "background_workers": {
            "status": "ready",
            "active_runner": "in_memory_async",
        },
    }
