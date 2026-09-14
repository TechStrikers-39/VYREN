from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional
from datetime import datetime


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, description="Password must be at least 6 characters")
    full_name: Optional[str] = None
    role: Optional[str] = Field("learner", description="Role: learner, trainer, or admin")
    organization: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LearnerOnboardingRequest(BaseModel):
    department: Optional[str] = None
    designation: Optional[str] = None
    responsibilities: Optional[str] = None
    tools_experience: Optional[List[str]] = Field(default_factory=list)
    self_reported_level: Optional[int] = Field(0, ge=0, le=4)
    target_competencies: Optional[List[str]] = Field(default_factory=list)


class UserProfileResponse(BaseModel):
    id: str
    email: str
    full_name: Optional[str] = None
    organization: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    igot_id: Optional[str] = None
    role: str
    responsibilities: Optional[str] = None
    tools_experience: Optional[List[str]] = None
    self_reported_level: Optional[int] = None
    target_competencies: Optional[List[str]] = None
    onboarding_completed: Optional[bool] = False
    created_at: datetime
    updated_at: datetime


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: Optional[int] = None
    user: UserProfileResponse

