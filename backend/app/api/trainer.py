from fastapi import APIRouter, Depends, status
from typing import List

from app.core.dependencies import require_role
from app.repositories.competency_repo import CompetencyRepository
from app.repositories.trainer_repo import TrainerRepository
from app.schemas.assessment import AssessmentDetailResponse
from app.schemas.trainer import (
    AssessmentCreateRequest,
    GeneratedItem,
    ItemCreateRequest,
    ItemGenerateRequest,
    LearnerCohortItem,
    TrainerCohortSummary,
)
from app.services.ai_assistant import AIAssistantService

router = APIRouter()


@router.get(
    "/cohort",
    response_model=TrainerCohortSummary,
    summary="Get cohort capability summary",
)
async def get_cohort_summary(
    current_trainer: dict = Depends(require_role("trainer", "admin")),
):
    """
    Get cohort capability summary and gap metrics.
    STRICT SERVER-SIDE RBAC: Restricted to 'trainer' or 'admin' roles.
    """
    result = TrainerRepository.get_cohort_summary()
    return TrainerCohortSummary(**result)


@router.get(
    "/learners",
    response_model=List[LearnerCohortItem],
    summary="List all learners in cohort for readiness monitoring",
)
async def list_cohort_learners(
    current_trainer: dict = Depends(require_role("trainer", "admin")),
):
    """
    List individual enrolled learners, their competency index, and top priority gaps.
    STRICT SERVER-SIDE RBAC: Restricted to 'trainer' or 'admin' roles.
    """
    return TrainerRepository.list_learners()


@router.post(
    "/generate-items",
    response_model=List[GeneratedItem],
    summary="Generate assessment questions using Gemini AI with 9-stage validation",
)
async def generate_items(
    req: ItemGenerateRequest,
    current_trainer: dict = Depends(require_role("trainer", "admin")),
):
    """
    Invokes existing AI infrastructure (Gemini AI or grounded MoSPI item generator)
    to draft candidate MCQ questions. Runs each item through the 9-stage pedagogical
    validation pipeline before returning for trainer review.
    STRICT SERVER-SIDE RBAC: Restricted to 'trainer' or 'admin' roles.
    """
    competencies = CompetencyRepository.list_competencies()
    matched_comp = next((c for c in competencies if str(c["id"]) == req.competency_id), None)
    cname = matched_comp["name"] if matched_comp else "Statistical Inference"

    raw_items = await AIAssistantService.generate_assessment_items(
        competency_name=cname,
        competency_id=req.competency_id,
        difficulty=req.difficulty,
        count=req.count,
        focus_area=req.focus_area,
    )
    return [GeneratedItem(**it) for it in raw_items]


@router.get(
    "/items",
    summary="List item bank items",
)
async def list_items(
    current_trainer: dict = Depends(require_role("trainer", "admin")),
):
    """
    List assessment item bank items with complete metadata.
    STRICT SERVER-SIDE RBAC: Restricted to 'trainer' or 'admin' roles.
    """
    return TrainerRepository.list_items()


@router.post(
    "/items",
    status_code=status.HTTP_201_CREATED,
    summary="Create new assessment item",
)
async def create_item(
    req: ItemCreateRequest,
    current_trainer: dict = Depends(require_role("trainer", "admin")),
):
    """
    Create a new MCQ item in the assessment item bank.
    STRICT SERVER-SIDE RBAC: Restricted to 'trainer' or 'admin' roles.
    """
    return TrainerRepository.create_item(req.model_dump())


@router.get(
    "/assessments",
    summary="List assessment definitions for authoring",
)
async def list_assessments(
    current_trainer: dict = Depends(require_role("trainer", "admin")),
):
    """
    List all assessment definitions for trainer authoring.
    STRICT SERVER-SIDE RBAC: Restricted to 'trainer' or 'admin' roles.
    """
    return TrainerRepository.list_assessments()


@router.post(
    "/assessments",
    status_code=status.HTTP_201_CREATED,
    summary="Create assessment framework definition",
)
async def create_assessment(
    req: AssessmentCreateRequest,
    current_trainer: dict = Depends(require_role("trainer", "admin")),
):
    """
    Create a new assessment framework definition.
    STRICT SERVER-SIDE RBAC: Restricted to 'trainer' or 'admin' roles.
    """
    creator_id = current_trainer["id"]
    return TrainerRepository.create_assessment(creator_id, req.model_dump())

