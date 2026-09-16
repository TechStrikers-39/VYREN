from fastapi import APIRouter, Depends

from app.core.dependencies import get_current_user
from app.schemas.assistant import AIStatusResponse, ChatRequest, ChatResponse
from app.services.ai_assistant import AIAssistantService

router = APIRouter()


@router.get(
    "/status",
    response_model=AIStatusResponse,
    summary="Get AI assistant engine integration status and active provider diagnostics",
)
async def get_ai_status(
    current_user: dict = Depends(get_current_user),
):
    """
    Returns authentic AI engine status:
    - LIVE (if valid GEMINI_API_KEY is configured in backend environment with gemini-3.8-flash)
    - UNAVAILABLE (if key is missing or unconfigured, reporting exact blocker reasons)
    """
    status_data = AIAssistantService.get_status()
    return AIStatusResponse(**status_data)


@router.post(
    "/chat",
    response_model=ChatResponse,
    summary="Interactive AI learning assistant chat with context injection",
)
async def chat_with_assistant(
    req: ChatRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Chat with VYREN AI assistant.
    Injects learner's current competency scores, active skill gaps, and organization role into Gemini prompt context.
    IDOR protected — scoped strictly to current user.
    """
    user_id = current_user["id"]
    history_dicts = [h.model_dump() for h in req.history] if req.history else []

    res = await AIAssistantService.generate_response(
        user_id=user_id,
        user_message=req.message,
        history=history_dicts,
    )
    return ChatResponse(**res)
