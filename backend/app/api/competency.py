from fastapi import APIRouter, Depends
from typing import List

from app.core.dependencies import get_current_user
from app.repositories.competency_repo import CompetencyRepository
from app.schemas.competency import CompetencyDefinitionResponse

router = APIRouter()


@router.get(
    "",
    response_model=List[CompetencyDefinitionResponse],
    summary="List all registered competency definitions",
)
async def list_competencies(current_user: dict = Depends(get_current_user)):
    """
    List all domain competency definitions registered in the system.
    Requires authentication.
    """
    return CompetencyRepository.list_competencies()
