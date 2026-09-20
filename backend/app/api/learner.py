from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from typing import List

from app.core.dependencies import get_current_user
from app.repositories.competency_repo import CompetencyRepository
from app.repositories.course_repo import CourseRepository
from app.repositories.user_repo import UserRepository
from app.schemas.auth import LearnerOnboardingRequest, UserProfileResponse
from app.schemas.course import LearningPathResponse
from app.schemas.learner import (
    CompetencyScoreResponse,
    ProfileUpdateRequest,
    RecommendationResponse,
    SkillGapResponse,
)

router = APIRouter()


@router.get(
    "/profile",
    response_model=UserProfileResponse,
    summary="Get current learner profile",
)
async def get_profile(current_user: dict = Depends(get_current_user)):
    """
    Fetch the authenticated learner's full profile.
    IDOR protected — scoped strictly to current user.
    """
    return UserProfileResponse(**current_user)


@router.put(
    "/profile",
    response_model=UserProfileResponse,
    summary="Update learner profile",
)
async def update_profile(
    req: ProfileUpdateRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Update learner profile details (organization, department, designation, full_name, igot_id).
    IDOR protected — scoped strictly to current user.
    """
    user_id = current_user["id"]
    updated_profile = UserRepository.update_profile(user_id, req.model_dump())
    return UserProfileResponse(**updated_profile)


@router.post(
    "/onboarding",
    response_model=UserProfileResponse,
    summary="Submit first-time learner contextual onboarding",
)
async def submit_onboarding(
    req: LearnerOnboardingRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
):
    """
    Persist 4-5 questions of contextual profile data for first-time learners.
    Does NOT mutate measured competency scores (context != measurement).
    Sets onboarding_completed = true.
    IDOR protected — scoped strictly to current user.
    """
    from app.services.assessment_orchestrator import AssessmentOrchestrationService

    user_id = current_user["id"]
    updated_profile = UserRepository.submit_onboarding(user_id, req.model_dump())

    # Pre-generate personalized baseline assessment in the background
    background_tasks.add_task(
        AssessmentOrchestrationService.get_or_create_personalized_assessment,
        user_id=user_id,
    )

    return UserProfileResponse(**updated_profile)



@router.get(
    "/scores",
    response_model=List[CompetencyScoreResponse],
    summary="Get learner competency scores",
)
async def get_scores(current_user: dict = Depends(get_current_user)):
    """
    Fetch measured performance scores and confidence levels per competency for the current learner.
    IDOR protected — scoped strictly to current user.
    """
    user_id = current_user["id"]
    scores = CompetencyRepository.get_scores_by_user(user_id)
    return [CompetencyScoreResponse(**s) for s in scores]


@router.get(
    "/gaps",
    response_model=List[SkillGapResponse],
    summary="Get learner skill gaps",
)
async def get_gaps(current_user: dict = Depends(get_current_user)):
    """
    Fetch measured skill gaps (current level vs required level) with calculated priority.
    IDOR protected — scoped strictly to current user.
    """
    user_id = current_user["id"]
    gaps = CompetencyRepository.get_gaps_by_user(user_id)
    return [SkillGapResponse(**g) for g in gaps]


@router.get(
    "/recommendations",
    response_model=List[RecommendationResponse],
    summary="Get adaptive recommendations",
)
async def get_recommendations(current_user: dict = Depends(get_current_user)):
    """
    Fetch active adaptive learning recommendations for the current learner.
    IDOR protected — scoped strictly to current user.
    """
    user_id = current_user["id"]
    recs = CompetencyRepository.get_recommendations_by_user(user_id)
    return [RecommendationResponse(**r) for r in recs]


@router.get(
    "/learning-path",
    response_model=LearningPathResponse,
    summary="Get personalized adaptive learning path sequence",
)
async def get_learning_path(current_user: dict = Depends(get_current_user)):
    """
    Fetch the authenticated learner's structured adaptive learning path.
    IDOR protected — scoped strictly to current user.
    """
    user_id = current_user["id"]
    lp = CourseRepository.get_learning_path(user_id)
    return LearningPathResponse(**lp)


@router.post(
    "/demo-reset",
    summary="Reset demo learner state to fresh un-onboarded baseline",
)
async def reset_demo_learner(
    current_user: dict = Depends(get_current_user),
):
    """
    Dedicated endpoint to reset demo learner account (alex.vance@gmail.com).
    Strictly verifies identity: requires BOTH demo UUID and demo email.
    Clears assessment instances, results, scores, gaps, recommendations,
    enrollments, and resets onboarding state.
    Returns HTTP 403 for any other user.
    """
    from app.services.demo_service import DemoResetService

    return await DemoResetService.reset_demo_learner(
        user_id=current_user["id"],
        email=current_user.get("email", ""),
    )


