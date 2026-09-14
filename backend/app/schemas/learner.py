from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class ProfileUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    organization: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    igot_id: Optional[str] = None


class CompetencyScoreResponse(BaseModel):
    id: str
    user_id: str
    competency_id: str
    competency_name: Optional[str] = None
    competency_category: Optional[str] = None
    score: float = Field(..., ge=0, le=100)
    measured_level: int = Field(..., ge=0, le=4)
    confidence: float = Field(..., ge=0, le=1)
    last_assessed_at: Optional[datetime] = None
    updated_at: datetime


class SkillGapResponse(BaseModel):
    id: str
    user_id: str
    competency_id: str
    competency_name: Optional[str] = None
    competency_category: Optional[str] = None
    current_level: int = Field(..., ge=0, le=4)
    required_level: int = Field(..., ge=0, le=4)
    gap_size: int
    priority: str = Field(..., description="HIGH, MEDIUM, LOW, or NONE")
    updated_at: datetime


class RecommendationResponse(BaseModel):
    id: str
    user_id: str
    competency_id: Optional[str] = None
    course_id: Optional[str] = None
    skill_gap_id: Optional[str] = None
    title: str
    description: Optional[str] = None
    priority: str = Field(..., description="HIGH, MEDIUM, LOW")
    type: str = Field(..., description="course, assessment, resource")
    is_dismissed: bool = False
    created_at: datetime
