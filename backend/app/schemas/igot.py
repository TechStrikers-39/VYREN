from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class IgotStatusResponse(BaseModel):
    mode: str = Field(..., description="'REAL' or 'FALLBACK / LOCAL'")
    is_real: bool
    provider: str
    endpoint: Optional[str] = None
    authenticated: bool
    blocker_summary: Optional[str] = None
    blocker_details: Optional[str] = None
    capabilities: List[str]
    timestamp: datetime


class KarmayogiCompetencyClaim(BaseModel):
    competency_id: str
    competency_name: str
    frac_domain: str
    measured_level: int = Field(..., ge=0, le=4)
    karmayogi_proficiency_level: str
    score_percentage: float
    confidence_level: float
    evidence_summary: str


class KarmayogiPassportResponse(BaseModel):
    passport_id: str
    user_id: str
    learner_name: str
    organization: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    igot_id: Optional[str] = None
    issued_at: datetime
    issuer: str = "VYREN Local FRAC Standard Engine (MoSPI/CBC Framework Aligned)"
    credential_standard: str = "W3C-VC-Karmayogi-FRAC-1.0"
    integration_mode: str = Field("FALLBACK / LOCAL", description="'REAL' or 'FALLBACK / LOCAL'")
    is_official_government_credential: bool = False
    verification_notice: Optional[str] = None
    claims: List[KarmayogiCompetencyClaim]


class FRACMappingItem(BaseModel):
    vyren_competency_id: str
    vyren_name: str
    vyren_category: str
    igot_frac_code: str
    igot_competency_area: str
    level_mappings: Dict[str, str]
    integration_mode: str = "FALLBACK / LOCAL"


class IgotCourseItem(BaseModel):
    id: str
    title: str
    provider: str
    competency_area: str
    duration: str
    integration_mode: str = "FALLBACK / LOCAL"
    external_url: Optional[str] = None
    external_id: Optional[str] = None
    do_id: Optional[str] = None


class NormalizedCourseModule(BaseModel):
    id: str
    course_id: str
    competency_id: Optional[str] = None
    title: str
    type: str = "reading"
    content: Optional[str] = None
    order_index: int = 0
    duration_minutes: int = 15
    external_id: Optional[str] = None


class NormalizedCourse(BaseModel):
    id: str  # Deterministic UUIDv5
    external_id: str  # Sunbird DO_ID (e.g. do_113840294924828672111)
    title: str
    description: Optional[str] = None
    provider: str
    category: Optional[str] = None
    level: int = 1
    duration_minutes: int = 60
    competencies_covered: List[str] = []
    competency_names: List[str] = []
    external_url: Optional[str] = None
    integration_mode: str = Field("REAL / SUNBIRD", description="'REAL / SUNBIRD' or 'FALLBACK / LOCAL'")
    modules: List[NormalizedCourseModule] = []
    source_metadata: Optional[Dict[str, Any]] = None

