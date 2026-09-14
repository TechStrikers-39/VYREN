from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from datetime import datetime


class AdminUserListItem(BaseModel):
    id: str
    email: str
    full_name: Optional[str] = None
    organization: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    role: str
    created_at: datetime
    competency_index: Optional[float] = Field(None, description="Average measured score across competencies")


class AdminUsersListResponse(BaseModel):
    users: List[AdminUserListItem]
    total_count: int


class AdminAnalyticsResponse(BaseModel):
    total_learners: int
    avg_competency_index: float
    gap_distribution: Dict[str, int]  # HIGH: 5, MEDIUM: 3, LOW: 2, NONE: 10
    active_assessments_count: int
    active_courses_count: int
