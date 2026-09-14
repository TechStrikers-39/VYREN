from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class CourseModuleResponse(BaseModel):
    id: str
    course_id: str
    competency_id: Optional[str] = None
    title: str
    type: str = Field(..., description="reading, video, code_exercise, quiz")
    content: Optional[str] = None
    order_index: int
    duration_minutes: int


class CourseResponse(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    category: Optional[str] = None
    level: int
    duration_minutes: int
    competencies_covered: List[str]
    is_active: bool
    provider: Optional[str] = "VYREN Local Standard (iGOT Aligned)"
    external_id: Optional[str] = None
    external_url: Optional[str] = None
    integration_mode: Optional[str] = "FALLBACK / LOCAL"


class CourseDetailResponse(CourseResponse):
    modules: List[CourseModuleResponse]


class LearningPathStep(BaseModel):
    id: str
    title: str
    category: str
    duration: str
    status: str = Field(..., description="completed, in_progress, upcoming, recommended")
    description: str
    link: str
    action_text: str
    course_id: Optional[str] = None
    module_id: Optional[str] = None
    competency_id: Optional[str] = None
    competency_name: Optional[str] = None
    provider: Optional[str] = None
    integration_mode: Optional[str] = None


class LearningPathResponse(BaseModel):
    learner_id: str
    learner_name: str
    completion_percentage: float
    total_steps: int
    completed_steps: int
    active_step_id: Optional[str] = None
    steps: List[LearningPathStep]



class CourseEnrollmentResponse(BaseModel):
    id: str
    user_id: str
    course_id: str
    progress_percentage: float = Field(..., ge=0, le=100)
    completed_modules: List[str]
    status: str = Field(..., description="enrolled, in_progress, completed")
    enrolled_at: datetime
    completed_at: Optional[datetime] = None


class ModuleCompletionResponse(BaseModel):
    message: str
    module_id: str
    course_id: str
    progress_percentage: float
    recalibrated_competency_id: Optional[str] = None
    recalibrated_score: Optional[float] = None
    recalibrated_level: Optional[int] = None
    updated_gap_priority: Optional[str] = None
