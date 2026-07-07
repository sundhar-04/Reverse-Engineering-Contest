from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from bson import ObjectId
from app.core.database import PyObjectId


class ParticipantBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    roll_number: str = Field(..., min_length=1, max_length=50)
    department: str = Field(..., min_length=1, max_length=100)


class ParticipantCreate(ParticipantBase):
    contest_id: str


class ParticipantInDB(ParticipantBase):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    contest_id: PyObjectId
    joined_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class ParticipantResponse(ParticipantBase):
    id: str
    contest_id: str
    joined_at: datetime
    is_active: bool


class JoinContestRequest(BaseModel):
    contest_id: str
    name: str = Field(..., min_length=1, max_length=100)
    roll_number: str = Field(..., min_length=1, max_length=50)
    department: str = Field(..., min_length=1, max_length=100)


class JoinContestResponse(BaseModel):
    participant_id: str
    message: str