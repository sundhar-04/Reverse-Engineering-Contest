from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from bson import ObjectId
from app.core.database import PyObjectId


class ProblemBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field(default="", max_length=5000)
    score: int = Field(default=100, ge=1, le=10000)
    time_limit: int = Field(default=2, ge=1, le=30)
    memory_limit: int = Field(default=256, ge=64, le=1024)


class ProblemCreate(ProblemBase):
    contest_id: str


class ProblemInDB(ProblemBase):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    contest_id: PyObjectId
    executable_name: Optional[str] = None
    executable_url: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class ProblemResponse(ProblemBase):
    id: str
    contest_id: str
    executable_name: Optional[str]
    executable_url: Optional[str]
    is_active: bool
    created_at: datetime
    updated_at: datetime


class ProblemUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=5000)
    score: Optional[int] = Field(None, ge=1, le=10000)
    time_limit: Optional[int] = Field(None, ge=1, le=30)
    memory_limit: Optional[int] = Field(None, ge=64, le=1024)