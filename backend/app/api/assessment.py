from fastapi import APIRouter, Depends, HTTPException, status

from app.core.dependencies import get_current_user
from app.repositories.assessment_repo import AssessmentRepository
from app.schemas.assessment import (
    AssessmentDetailResponse,
    AssessmentResultResponse,
    AssessmentSubmissionRequest,
)

router = APIRouter()


@router.get(
    "/{assessment_id}",
    response_model=AssessmentDetailResponse,
    summary="Fetch assessment definition and items",
)
async def get_assessment(
    assessment_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Fetch assessment definition and list of MCQ items.
    SECURITY: `correct_index` is omitted from the response.
    """
    assessment = AssessmentRepository.get_assessment_detail(assessment_id)
    if not assessment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Assessment '{assessment_id}' not found or inactive.",
        )
    return AssessmentDetailResponse(**assessment)


@router.post(
    "/{assessment_id}/submit",
    response_model=AssessmentResultResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit assessment answers for deterministic evaluation",
)
async def submit_assessment(
    assessment_id: str,
    req: AssessmentSubmissionRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Submit assessment answers.
    Evaluates score deterministically, computes independent confidence,
    updates competency scores and skill gaps, and returns result record with full evidence vector.
    """
    user_id = current_user["id"]
    answers_dict = {ans.item_id: ans.selected_option_index for ans in req.answers}

    try:
        result = AssessmentRepository.process_and_store_submission(
            user_id=user_id,
            assessment_id=assessment_id,
            answers_dict=answers_dict,
        )
        return AssessmentResultResponse(**result)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )


@router.get(
    "/results/{result_id}",
    response_model=AssessmentResultResponse,
    summary="Fetch stored assessment result by ID",
)
async def get_assessment_result(
    result_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Fetch stored assessment result record including full evidence vector.
    IDOR protected — scoped strictly to current learner's own results.
    """
    user_id = current_user["id"]
    result = AssessmentRepository.get_result(result_id, user_id)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assessment result not found or access denied.",
        )
    return AssessmentResultResponse(**result)


@router.get(
    "/{assessment_id}/latest-result",
    response_model=AssessmentResultResponse,
    summary="Fetch latest stored assessment result for this assessment and learner",
)
async def get_latest_assessment_result(
    assessment_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Fetch the most recent assessment result for this assessment by the authenticated learner.
    """
    user_id = current_user["id"]
    result = AssessmentRepository.get_latest_result_for_assessment(assessment_id, user_id)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No assessment result found for this assessment and user.",
        )
    return AssessmentResultResponse(**result)
