from fastapi import APIRouter, HTTPException
from app.services.execution_service import execute_code

router = APIRouter()


@router.post("/run")
async def run_code(request: dict):
    code = request.get("code", "")
    input_data = request.get("input", "")
    time_limit = request.get("time_limit", 2)
    memory_limit = request.get("memory_limit", 256)
    
    if not code.strip():
        raise HTTPException(status_code=400, detail="Code is required")
    
    result = await execute_code(code, input_data, time_limit, memory_limit)
    return result