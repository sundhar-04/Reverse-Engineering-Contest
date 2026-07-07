from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from bson import ObjectId
from app.core.database import PyObjectId


class TestCaseBase(BaseModel):
    input_data: str
    expected_output: str
    test_order: int = Field(default=0, ge=0)
    is_sample: bool = False


class TestCaseCreate(TestCaseBase):
    problem_id: str


class TestCaseInDB(TestCaseBase):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    problem_id: PyObjectId
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class TestCaseResponse(TestCaseBase):
    id: str
    problem_id: str
    created_at: datetime


class TestCaseUploadRequest(BaseModel):
    input_data: str
    expected_output: str
    test_order: int = 0
    is_sample: bool = False