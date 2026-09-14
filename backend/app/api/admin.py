from fastapi import APIRouter, Depends, Response

from app.core.dependencies import require_role
from app.repositories.admin_repo import AdminRepository
from app.schemas.admin import AdminAnalyticsResponse, AdminUsersListResponse

router = APIRouter()


@router.get(
    "/users",
    response_model=AdminUsersListResponse,
    summary="List all users with competency index",
)
async def list_users(
    current_admin: dict = Depends(require_role("admin")),
):
    """
    List all registered users in the organization with calculated competency index.
    STRICT SERVER-SIDE RBAC: Restricted to 'admin' role only.
    """
    result = AdminRepository.list_users()
    return AdminUsersListResponse(**result)


@router.get(
    "/analytics",
    response_model=AdminAnalyticsResponse,
    summary="Get org-wide competency analytics",
)
async def get_analytics(
    current_admin: dict = Depends(require_role("admin")),
):
    """
    Get organization-wide aggregate capability metrics and skill gap distribution.
    STRICT SERVER-SIDE RBAC: Restricted to 'admin' role only.
    """
    result = AdminRepository.get_analytics()
    return AdminAnalyticsResponse(**result)


@router.get(
    "/training-effectiveness",
    summary="Get enterprise training program effectiveness and enrollment metrics",
)
async def get_training_effectiveness(
    current_admin: dict = Depends(require_role("admin")),
):
    """
    Get course-by-course enrollment numbers, completion rates, and average progress.
    STRICT SERVER-SIDE RBAC: Restricted to 'admin' role only.
    """
    return AdminRepository.get_training_effectiveness()


@router.get(
    "/export/workforce-matrix",

    summary="Export workforce competency matrix as CSV",
)
async def export_workforce_matrix(
    current_admin: dict = Depends(require_role("admin")),
):
    """
    Export comprehensive organization workforce competency matrix as CSV.
    STRICT SERVER-SIDE RBAC: Restricted to 'admin' role only.
    """
    csv_content = AdminRepository.export_workforce_matrix_csv()
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={
            "Content-Disposition": "attachment; filename=vyren_workforce_competency_matrix.csv"
        },
    )
