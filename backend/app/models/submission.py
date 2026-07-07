from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from bson import ObjectId
from app.core.database import PyObjectId


class FailedTestCase(BaseModel):
    test_case_id: Optional[str] = None
    input: str
    expected_output: str
    actual_output: str
    test_order: int


class SubmissionBase(BaseModel):
    code: str
    language: str = "python"
    custom_input: str = ""
    is_custom_run: bool = False


class SubmissionCreate(SubmissionBase):
    participant_id: str
    problem_id: str
    contest_id: str


class SubmissionInDB(SubmissionBase):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    participant_id: PyObjectId
    problem_id: PyObjectId
    contest_id: PyObjectId
    
    # Custom run results
    custom_output: Optional[str] = None
    custom_error: Optional[str] = None
    custom_runtime: Optional[int] = None
    custom_status: Optional[str] = None
    custom_memory: Optional[float] = None
    
    # Judge results
    verdict: str = Field(default="pending", pattern="^(pending|running|accepted|wrong_answer|runtime_error|time_limit_exceeded|memory_limit_exceeded|compile_error)$")
    failed_test_case: Optional[FailedTestCase] = None
    passed_test_cases: int = 0
    total_test_cases: int = 0
    execution_time: Optional[int] = None
    memory_used: Optional[float] = None
    
    submitted_at: datetime = Field(default_factory=datetime.utcnow)
    judged_at: Optional[datetime] = None
    
    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class SubmissionResponse(SubmissionBase):
    id: str
    participant_id: str
    problem_id: str
    contest_id: str
    
    custom_output: Optional[str] = None
    custom_error: Optional[str] = None
    custom_runtime: Optional[int] = None
    custom_status: Optional[str] = None
    custom_memory: Optional[float] = None
    
    verdict: str
    failed_test_case: Optional[FailedTestCase] = None
    passed_test_cases: int
    total_test_cases: int
    execution_time: Optional[int] = None
    memory_used: Optional[float] = None
    
    submitted_at: datetime
    judged_at: Optional[datetime] = None


class RunCodeRequest(BaseModel):
    code: str
    input: str = ""
    participant_id: str
    problem_id: str
    time_limit: int = 2
    memory_limit: int = 256


class RunCodeResponse(BaseModel):
    stdout: str
    stderr: str
    runtime_ms: int
    memory_mb: float
    status: str  # success, timeout, memory_limit, runtime_error, compile_error


class SubmitCodeRequest(BaseModel):
    code: str
    participant_id: str
    problem_id: str


class SubmitCodeResponse(BaseModel):
    verdict: str
    passed_test_cases: int
    total_test_cases: int
    failed_test_case: Optional[FailedTestCase] = None
    execution_time: int
    memory_used: float