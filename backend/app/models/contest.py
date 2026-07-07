from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field
from bson import ObjectId
from app.core.database import PyObjectId


class ContestSettings(BaseModel):
    max_participants: int = 100
    max_submissions: int = 100
    time_limit_per_test: int = 2
    memory_limit: int = 256


class ContestBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: str = Field(default="", max_length=1000)
    start_time: datetime
    end_time: datetime
    settings: ContestSettings = Field(default_factory=ContestSettings)


class ContestCreate(ContestBase):
    pass


class ContestUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=1000)
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    settings: Optional[ContestSettings] = None


class ContestInDB(ContestBase):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    status: str = Field(default="draft", pattern="^(draft|running|ended|archived)$")
    executable_url: Optional[str] = None
    executable_name: Optional[str] = None
    created_by: PyObjectId
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class ContestResponse(ContestBase):
    id: str
    status: str
    executable_url: Optional[str]
    executable_name: Optional[str]
    created_by: str
    created_at: datetime
    updated_at: datetime


class ContestStatusResponse(BaseModel):
    contest_id: str
    status: str
    start_time: datetime
    end_time: datetime
    is_active: bool
    time_remaining: Optional[int] = None  # seconds