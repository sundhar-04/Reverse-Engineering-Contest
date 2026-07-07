from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List
from bson import ObjectId
from datetime import datetime
from app.api.deps import get_database, get_current_active_admin
from app.models.problem import ProblemCreate, ProblemResponse

router = APIRouter()


@router.post("", response_model=ProblemResponse)
async def create_problem(
    problem_data: ProblemCreate,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_admin: dict = Depends(get_current_active_admin)
):
    # Verify contest exists
    contest = await db.contests.find_one({"_id": ObjectId(problem_data.contest_id)})
    if not contest:
        raise HTTPException(status_code=404, detail="Contest not found")
    
    problem_doc = problem_data.model_dump()
    problem_doc["contest_id"] = ObjectId(problem_data.contest_id)
    problem_doc["is_active"] = True
    problem_doc["created_at"] = datetime.utcnow()
    problem_doc["updated_at"] = datetime.utcnow()
    
    result = await db.problems.insert_one(problem_doc)
    problem_doc["_id"] = result.inserted_id
    
    return ProblemResponse(
        id=str(problem_doc["_id"]),
        **{k: v for k, v in problem_doc.items() if k != "_id"}
    )


@router.get("/contest/{contest_id}", response_model=List[ProblemResponse])
async def list_problems(
    contest_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    problems = await db.problems.find({"contest_id": ObjectId(contest_id)}).to_list(100)
    return [
        ProblemResponse(
            id=str(p["_id"]),
            title=p["title"],
            description=p["description"],
            time_limit=p["time_limit"],
            memory_limit=p["memory_limit"],
            contest_id=str(p["contest_id"]),
            executable_name=p.get("executable_name"),
            is_active=p["is_active"],
            created_at=p["created_at"],
            updated_at=p["updated_at"]
        )
        for p in problems
    ]


@router.get("/{problem_id}", response_model=ProblemResponse)
async def get_problem(
    problem_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    problem = await db.problems.find_one({"_id": ObjectId(problem_id)})
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    return ProblemResponse(
        id=str(problem["_id"]),
        title=problem["title"],
        description=problem["description"],
        time_limit=problem["time_limit"],
        memory_limit=problem["memory_limit"],
        contest_id=str(problem["contest_id"]),
        executable_name=problem.get("executable_name"),
        is_active=problem["is_active"],
        created_at=problem["created_at"],
        updated_at=problem["updated_at"]
    )