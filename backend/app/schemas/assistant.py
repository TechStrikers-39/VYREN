from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class AIStatusResponse(BaseModel):
    model_config = {"protected_namespaces": ()}

    mode: str = Field(..., description="'LIVE' or 'UNAVAILABLE' or 'FALLBACK / LOCAL'")
    is_real: bool
    provider: str
    model_name: str
    authenticated: bool
    configured: bool = False
    live_test: Optional[str] = "not_run"
    thinking_config: Optional[str] = None
    blocker_summary: Optional[str] = None
    blocker_details: Optional[str] = None
    capabilities: List[str]
    timestamp: datetime


class ChatMessage(BaseModel):
    role: str = Field(..., description="user or assistant")
    content: str


class ChatRequest(BaseModel):
    message: str
    history: Optional[List[ChatMessage]] = []


class ChatResponse(BaseModel):
    model_config = {"protected_namespaces": ()}

    reply: str
    suggested_actions: Optional[List[str]] = []
    grounded_context_used: Optional[bool] = True
    integration_mode: str = Field("LIVE", description="'LIVE' or 'UNAVAILABLE' or 'FALLBACK / LOCAL'")
    provider: str = "google-gemini"
    model_name: str = "gemini-3.8-flash"
    mode: Optional[str] = "LIVE"
    latency_ms: Optional[float] = None
    request_id: Optional[str] = None
