from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List
from bson import ObjectId
from datetime import datetime
import os
import shutil
from app.api.deps import get_database, get_current_active_admin
from app.models.problem import ProblemCreate, ProblemResponse, ProblemUpdate
from app.core.config import settings

router = APIRouter()


@router.post("", response_model=ProblemResponse)
async def create_problem(
    problem_data: ProblemCreate,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_admin: dict = Depends(get_current_active_admin)
):
    contest = await db.contests.find_one({"_id": ObjectId(problem_data.contest_id)})
    if not contest:
        raise HTTPException(status_code=404, detail="Contest not found")

    problem_doc = problem_data.model_dump()
    problem_doc["contest_id"] = ObjectId(problem_data.contest_id)
    problem_doc["executable_name"] = None
    problem_doc["executable_url"] = None
    problem_doc["is_active"] = True
    problem_doc["created_at"] = datetime.utcnow()
    problem_doc["updated_at"] = datetime.utcnow()

    result = await db.problems.insert_one(problem_doc)
    problem_doc["_id"] = result.inserted_id

    return ProblemResponse(
        id=str(problem_doc["_id"]),
        title=problem_doc["title"],
        description=problem_doc["description"],
        score=problem_doc["score"],
        time_limit=problem_doc["time_limit"],
        memory_limit=problem_doc["memory_limit"],
        contest_id=str(problem_doc["contest_id"]),
        executable_name=problem_doc.get("executable_name"),
        executable_url=problem_doc.get("executable_url"),
        is_active=problem_doc["is_active"],
        created_at=problem_doc["created_at"],
        updated_at=problem_doc["updated_at"]
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
            score=p.get("score", 100),
            time_limit=p["time_limit"],
            memory_limit=p["memory_limit"],
            contest_id=str(p["contest_id"]),
            executable_name=p.get("executable_name"),
            executable_url=p.get("executable_url"),
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
        score=problem.get("score", 100),
        time_limit=problem["time_limit"],
        memory_limit=problem["memory_limit"],
        contest_id=str(problem["contest_id"]),
        executable_name=problem.get("executable_name"),
        executable_url=problem.get("executable_url"),
        is_active=problem["is_active"],
        created_at=problem["created_at"],
        updated_at=problem["updated_at"]
    )


@router.put("/{problem_id}", response_model=ProblemResponse)
async def update_problem(
    problem_id: str,
    problem_data: ProblemUpdate,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_admin: dict = Depends(get_current_active_admin)
):
    problem = await db.problems.find_one({"_id": ObjectId(problem_id)})
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")

    update_data = problem_data.model_dump(exclude_unset=True)
    update_data["updated_at"] = datetime.utcnow()

    await db.problems.update_one(
        {"_id": ObjectId(problem_id)},
        {"$set": update_data}
    )

    updated = await db.problems.find_one({"_id": ObjectId(problem_id)})
    return ProblemResponse(
        id=str(updated["_id"]),
        title=updated["title"],
        description=updated["description"],
        score=updated.get("score", 100),
        time_limit=updated["time_limit"],
        memory_limit=updated["memory_limit"],
        contest_id=str(updated["contest_id"]),
        executable_name=updated.get("executable_name"),
        executable_url=updated.get("executable_url"),
        is_active=updated["is_active"],
        created_at=updated["created_at"],
        updated_at=updated["updated_at"]
    )


@router.delete("/{problem_id}")
async def delete_problem(
    problem_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_admin: dict = Depends(get_current_active_admin)
):
    problem = await db.problems.find_one({"_id": ObjectId(problem_id)})
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")

    # Delete executable file from disk
    if problem.get("executable_name"):
        file_path = os.path.join(settings.UPLOAD_DIR, f"{problem_id}_{problem['executable_name']}")
        if os.path.exists(file_path):
            os.remove(file_path)

    # Delete test cases
    await db.hidden_testcases.delete_many({"problem_id": ObjectId(problem_id)})
    # Delete submissions for this problem
    await db.submissions.delete_many({"problem_id": ObjectId(problem_id)})
    # Delete the problem
    await db.problems.delete_one({"_id": ObjectId(problem_id)})

    # Recalculate leaderboard
    from app.services.leaderboard_service import update_leaderboard
    await update_leaderboard(str(problem["contest_id"]), db)

    return {"message": "Problem deleted successfully"}


@router.post("/{problem_id}/executable")
async def upload_problem_executable(
    problem_id: str,
    file: UploadFile = File(...),
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_admin: dict = Depends(get_current_active_admin)
):
    problem = await db.problems.find_one({"_id": ObjectId(problem_id)})
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")

    allowed_extensions = [".exe", ".out", ".bin"]
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in allowed_extensions:
        raise HTTPException(status_code=400, detail=f"Invalid file type. Allowed: {allowed_extensions}")

    upload_dir = settings.UPLOAD_DIR
    os.makedirs(upload_dir, exist_ok=True)

    # Delete old executable if exists
    if problem.get("executable_name"):
        old_path = os.path.join(upload_dir, f"{problem_id}_{problem['executable_name']}")
        if os.path.exists(old_path):
            os.remove(old_path)

    file_path = os.path.join(upload_dir, f"{problem_id}_{file.filename}")
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    await db.problems.update_one(
        {"_id": ObjectId(problem_id)},
        {"$set": {
            "executable_url": f"/api/problems/{problem_id}/executable/download",
            "executable_name": file.filename,
            "updated_at": datetime.utcnow()
        }}
    )

    return {"message": "Executable uploaded", "filename": file.filename}


@router.get("/{problem_id}/executable/download")
async def download_problem_executable(
    problem_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    problem = await db.problems.find_one({"_id": ObjectId(problem_id)})
    if not problem or not problem.get("executable_name"):
        raise HTTPException(status_code=404, detail="Executable not found")

    file_path = os.path.join(settings.UPLOAD_DIR, f"{problem_id}_{problem['executable_name']}")
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Executable file not found")

    from fastapi.responses import FileResponse
    return FileResponse(
        file_path,
        filename=problem["executable_name"],
        media_type="application/octet-stream"
    )
