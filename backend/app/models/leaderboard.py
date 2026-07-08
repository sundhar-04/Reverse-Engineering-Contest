from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from bson import ObjectId
from app.core.database import PyObjectId


class LeaderboardEntryBase(BaseModel):
    contest_id: str
    participant_id: str
    participant_name: str
    roll_number: str
    department: str
    rank: int
    total_score: int = 0
    max_score: int = 0
    solved_count: int = 0
    total_problems: int = 0
    attempts: int = 0
    last_submission_time: Optional[datetime] = None


class LeaderboardEntryInDB(LeaderboardEntryBase):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class LeaderboardEntryResponse(LeaderboardEntryBase):
    id: str
    updated_at: datetime


class LeaderboardResponse(BaseModel):
    contest_id: str
    entries: list[LeaderboardEntryResponse]
    last_updated: datetime


class LeaderboardUpdateMessage(BaseModel):
    type: str = "leaderboard_update"
    data: list[LeaderboardEntryResponse]
    trigger: Optional[dict] = None


class LeaderboardInitMessage(BaseModel):
    type: str = "leaderboard_init"
    data: list[LeaderboardEntryResponse]