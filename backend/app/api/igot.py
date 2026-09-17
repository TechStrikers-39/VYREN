from fastapi import APIRouter, Depends, Query
from typing import List, Optional

from app.core.dependencies import get_current_user
from app.schemas.igot import (
    FRACMappingItem,
    IgotCourseItem,
    IgotStatusResponse,
    KarmayogiPassportResponse,
)
from app.services.igot_client import IGOTClientService

router = APIRouter()


@router.get(
    "/status",
    response_model=IgotStatusResponse,
    summary="Check real-time iGOT Karmayogi integration mode and blocker diagnostics",
)
async def get_igot_status(
    current_user: dict = Depends(get_current_user),
):
    """
    Returns authentic integration status:
    - REAL (if authenticated national gateway access is configured)
    - FALLBACK / LOCAL (if credentials are unavailable, reporting exact blocker reasons)
    """
    status_data = IGOTClientService.get_status()
    return IgotStatusResponse(**status_data)


@router.get(
    "/passport",
    response_model=KarmayogiPassportResponse,
    summary="Export learner's verifiable Karmayogi competency passport",
)
async def get_karmayogi_passport(
    current_user: dict = Depends(get_current_user),
):
    """
    Export the authenticated learner's digital competency passport in Karmayogi / W3C Verifiable Credential format.
    Translates VYREN assessment scores into civil service proficiency claims.
    Clearly distinguishes whether issued via LIVE external gateway or LOCAL fallback engine.
    IDOR protected — scoped strictly to current user.
    """
    user_id = current_user["id"]
    result = IGOTClientService.generate_karmayogi_passport(user_id)
    return KarmayogiPassportResponse(**result)


@router.get(
    "/frac-mapping",
    response_model=List[FRACMappingItem],
    summary="Fetch bidirectional VYREN-to-FRAC competency mapping reference",
)
async def get_frac_mappings(
    current_user: dict = Depends(get_current_user),
):
    """
    Fetch the competency mapping table between VYREN and iGOT Karmayogi FRAC domains.
    """
    mappings = IGOTClientService.get_frac_mappings()
    return [FRACMappingItem(**m) for m in mappings]


@router.get(
    "/courses",
    response_model=List[IgotCourseItem],
    summary="Fetch competency-aligned courses from active iGOT provider",
)
async def get_igot_courses(
    competency_area: Optional[str] = Query(None, description="Optional FRAC competency area filter"),
    current_user: dict = Depends(get_current_user),
):
    """
    Fetch training courses aligned with civil service competency areas.
    Explicitly tags courses with provider name and integration mode.
    """
    courses = IGOTClientService.get_courses(competency_area=competency_area)
    return [
        IgotCourseItem(
            **{
                **c,
                "do_id": c.get("external_id") or c.get("do_id"),
            }
        )
        for c in courses
    ]


@router.get(
    "/search",
    response_model=List[IgotCourseItem],
    summary="Search courses via active Sunbird/iGOT provider contract",
)
async def search_igot_courses(
    query: Optional[str] = Query(None, description="Search query string"),
    current_user: dict = Depends(get_current_user),
):
    """
    Search courses via active Sunbird/iGOT provider.
    """
    results = IGOTClientService.search_courses(query=query)
    items = []
    for c in results:
        ext_id = c.get("external_id") or c.get("do_id")
        items.append({
            "id": c["id"],
            "title": c["title"],
            "provider": c.get("provider", "iGOT Karmayogi"),
            "competency_area": c.get("category") or "Civil Service Analytics",
            "duration": f"{c.get('duration_minutes', 60)} mins",
            "integration_mode": c.get("integration_mode", "FALLBACK / LOCAL"),
            "external_url": c.get("external_url"),
            "external_id": ext_id,
            "do_id": ext_id,
        })
    return [IgotCourseItem(**i) for i in items]

