from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Union
from datetime import datetime


class ItemCreateRequest(BaseModel):
    assessment_id: str
    competency_id: str
    prompt: str
    options: List[str] = Field(..., min_items=4, max_items=4)
    correct_index: int = Field(..., ge=0, le=3)
    weight: float = Field(1.0, ge=0.1, le=5.0)
    difficulty: Union[str, float] = Field("MEDIUM", description="EASY, MEDIUM, HARD or float")
    order_index: int = 0

    @field_validator("difficulty", mode="before")
    @classmethod
    def normalize_difficulty(cls, v):
        if isinstance(v, (int, float)):
            if v < 0.4:
                return "EASY"
            elif v < 0.75:
                return "MEDIUM"
            else:
                return "HARD"
        return str(v).upper()


class AssessmentCreateRequest(BaseModel):
    title: str
    description: Optional[str] = None
    version: str = "1.0"
    time_limit_minutes: int = 30
    is_active: bool = True


class TrainerCohortSummary(BaseModel):
    total_cohort_size: int
    avg_score: float
    high_priority_gaps_count: int
    top_gap_competency: Optional[str] = None


class ItemGenerateRequest(BaseModel):
    competency_id: str
    difficulty: str = Field("MEDIUM", description="EASY, MEDIUM, or HARD")
    count: int = Field(3, ge=1, le=5)
    focus_area: Optional[str] = None
    locale: Optional[str] = "en"


class GeneratedItemValidation(BaseModel):
    is_valid: bool
    passed_stages_count: int
    total_stages: int
    stage_breakdown: dict


class GeneratedItem(BaseModel):
    prompt: str
    options: List[str]
    correct_index: int
    weight: float = 1.0
    difficulty: str = "MEDIUM"
    rationale: str
    competency_id: str
    validation: GeneratedItemValidation
    provider: str
    model: Optional[str] = "gemini-3.8-flash"
    mode: Optional[str] = "LIVE"


class LearnerCohortItem(BaseModel):
    id: str
    full_name: Optional[str] = None
    email: str
    designation: Optional[str] = None
    department: Optional[str] = None
    competency_index: Optional[float] = None
    active_gaps_count: int = 0
    top_gap: Optional[str] = None
    last_active: Optional[str] = None

