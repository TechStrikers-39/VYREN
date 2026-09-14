from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class AIStatusResponse(BaseModel):
    model_config = {"protected_namespaces": ()}

    mode: str = Field(..., description="'REAL' or 'FALLBACK / LOCAL'")
    is_real: bool
    provider: str
    model_name: str
    authenticated: bool
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
    integration_mode: str = Field("FALLBACK / LOCAL", description="'REAL' or 'FALLBACK / LOCAL'")
    provider: str = "VYREN Grounded Local Tutor"
    model_name: str = "vyren-grounded-rules-engine"
