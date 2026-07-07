from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from app.api.deps import get_database
from app.services.execution_service import execute_code
from app.models.submission import RunCodeRequest, RunCodeResponse

router = APIRouter()


@router.post("/run", response_model=RunCodeResponse)
async def run_code(
    request: RunCodeRequest,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    participant = await db.participants.find_one({"_id": ObjectId(request.participant_id)})
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found")
    
    problem = await db.problems.find_one({"_id": ObjectId(request.problem_id)})
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    result = await execute_code(request.code, request.input, request.time_limit, request.memory_limit)
    
    return RunCodeResponse(
        stdout=result.get("stdout", ""),
        stderr=result.get("stderr", ""),
        runtime_ms=result.get("runtime_ms", 0),
        memory_mb=result.get("memory_mb", 0.0),
        status=result.get("status", "error")
    )