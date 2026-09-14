from fastapi import APIRouter, Depends, HTTPException, status
from typing import List

from app.core.dependencies import get_current_user
from app.repositories.course_repo import CourseRepository
from app.schemas.course import (
    CourseDetailResponse,
    CourseEnrollmentResponse,
    CourseResponse,
    ModuleCompletionResponse,
)

router = APIRouter()


@router.get(
    "",
    response_model=List[CourseResponse],
    summary="List available courses",
)
async def list_courses(current_user: dict = Depends(get_current_user)):
    """
    List all active courses in the catalog.
    """
    courses = CourseRepository.list_courses()
    return [CourseResponse(**c) for c in courses]


@router.get(
    "/{course_id}",
    response_model=CourseDetailResponse,
    summary="Get course detail and curriculum modules",
)
async def get_course(
    course_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Fetch course detail including curriculum modules in order.
    """
    course = CourseRepository.get_course_detail(course_id)
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Course '{course_id}' not found.",
        )
    return CourseDetailResponse(**course)


@router.post(
    "/{course_id}/enroll",
    response_model=CourseEnrollmentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Enroll learner in a course",
)
async def enroll_course(
    course_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Enroll the authenticated learner in the specified course.
    IDOR protected — scoped strictly to current user.
    """
    user_id = current_user["id"]
    course = CourseRepository.get_course_detail(course_id)
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Course '{course_id}' not found.",
        )
    enrollment = CourseRepository.enroll_user(user_id, course_id)
    return CourseEnrollmentResponse(**enrollment)


@router.post(
    "/{course_id}/modules/{module_id}/complete",
    response_model=ModuleCompletionResponse,
    summary="Mark course module complete and recalibrate competency score",
)
async def complete_module(
    course_id: str,
    module_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Mark a course module as completed for the authenticated learner.
    Updates progress percentage and automatically recalibrates the associated competency score and skill gap in the database.
    IDOR protected — scoped strictly to current user.
    """
    user_id = current_user["id"]
    try:
        res = CourseRepository.complete_module(user_id, course_id, module_id)
        return ModuleCompletionResponse(**res)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
