from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class CompetencyDefinitionResponse(BaseModel):
    id: str
    name: str
    category: str
    description: Optional[str] = None
    level_0_descriptor: Optional[str] = None
    level_1_descriptor: Optional[str] = None
    level_2_descriptor: Optional[str] = None
    level_3_descriptor: Optional[str] = None
    level_4_descriptor: Optional[str] = None
    required_level: int = Field(3, ge=0, le=4)
    created_at: datetime
