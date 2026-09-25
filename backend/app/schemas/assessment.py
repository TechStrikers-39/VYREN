from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class AssessmentItemResponse(BaseModel):
    id: str
    assessment_id: str
    competency_id: str
    prompt: str
    options: List[str]
    # NOTE: correct_index is intentionally omitted here to prevent client-side leaks!
    weight: float = 1.0
    difficulty: str
    order_index: int
    item_source: Optional[str] = "anchor"
    question_type: Optional[str] = "APPLIED"


class AssessmentDetailResponse(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    version: str
    time_limit_minutes: int
    total_items: Optional[int] = None
    generation_mode: Optional[str] = None
    blueprint: Optional[Dict[str, Any]] = None
    items: List[AssessmentItemResponse]


class ItemAnswerSubmission(BaseModel):
    item_id: str
    selected_option_index: int = Field(..., ge=0, le=3)


class AssessmentSubmissionRequest(BaseModel):
    answers: List[ItemAnswerSubmission]


class CompetencyResultBreakdown(BaseModel):
    competency_id: str
    competency_name: Optional[str] = None
    category: Optional[str] = None
    score: float = Field(..., ge=0, le=100)
    measured_level: int = Field(..., ge=0, le=4)
    confidence: float = Field(..., ge=0, le=1)
    items_evaluated: int
    correct_items: int


class AssessmentResultResponse(BaseModel):
    id: str
    user_id: str
    assessment_id: str
    assessment_version: str
    overall_score: float
    competency_breakdown: Dict[str, Any]
    item_log: List[Dict[str, Any]]
    resulting_gaps: List[Dict[str, Any]]
    submitted_at: datetime
    top_recommendation: Optional[Dict[str, Any]] = None
