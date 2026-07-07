from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Optional
from datetime import datetime
from bson import ObjectId
import os
import shutil
from app.api.deps import get_database, get_current_active_admin
from app.models.contest import ContestCreate, ContestUpdate, ContestResponse, ContestStatusResponse
from app.models.problem import ProblemCreate, ProblemResponse
from app.core.config import settings

router = APIRouter()


@router.post("", response_model=ContestResponse)
async def create_contest(
    contest_data: ContestCreate,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_admin: dict = Depends(get_current_active_admin)
):
    contest_doc = contest_data.model_dump()
    contest_doc["created_by"] = ObjectId(current_admin["_id"])
    contest_doc["status"] = "draft"
    contest_doc["executable_url"] = None
    contest_doc["executable_name"] = None
    contest_doc["created_at"] = datetime.utcnow()
    contest_doc["updated_at"] = datetime.utcnow()
    
    result = await db.contests.insert_one(contest_doc)
    contest_doc["_id"] = result.inserted_id
    
    # Create a default problem for this contest
    problem_doc = {
        "contest_id": result.inserted_id,
        "title": "Reverse Engineering Challenge",
        "description": "Analyze the executable and write an equivalent Python solution",
        "time_limit": settings.DEFAULT_TIME_LIMIT,
        "memory_limit": settings.DEFAULT_MEMORY_LIMIT,
        "executable_name": None,
        "is_active": True,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    await db.problems.insert_one(problem_doc)
    
    return ContestResponse(
        id=str(contest_doc["_id"]),
        **{k: (str(v) if isinstance(v, ObjectId) else v) for k, v in contest_doc.items() if k != "_id"}
    )


@router.get("", response_model=List[ContestResponse])
async def list_contests(
    status: Optional[str] = None,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_admin: dict = Depends(get_current_active_admin)
):
    query = {}
    if status:
        query["status"] = status
    
    contests = await db.contests.find(query).sort("created_at", -1).to_list(100)
    return [
        ContestResponse(
            id=str(c["_id"]),
            name=c["name"],
            description=c["description"],
            start_time=c["start_time"],
            end_time=c["end_time"],
            settings=c["settings"],
            status=c["status"],
            executable_url=c.get("executable_url"),
            executable_name=c.get("executable_name"),
            created_by=str(c["created_by"]),
            created_at=c["created_at"],
            updated_at=c["updated_at"]
        )
        for c in contests
    ]


@router.get("/{contest_id}", response_model=ContestResponse)
async def get_contest(
    contest_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_admin: dict = Depends(get_current_active_admin)
):
    contest = await db.contests.find_one({"_id": ObjectId(contest_id)})
    if not contest:
        raise HTTPException(status_code=404, detail="Contest not found")
    
    return ContestResponse(
        id=str(contest["_id"]),
        name=contest["name"],
        description=contest["description"],
        start_time=contest["start_time"],
        end_time=contest["end_time"],
        settings=contest["settings"],
        status=contest["status"],
        executable_url=contest.get("executable_url"),
        executable_name=contest.get("executable_name"),
        created_by=str(contest["created_by"]),
        created_at=contest["created_at"],
        updated_at=contest["updated_at"]
    )


@router.put("/{contest_id}", response_model=ContestResponse)
async def update_contest(
    contest_id: str,
    contest_data: ContestUpdate,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_admin: dict = Depends(get_current_active_admin)
):
    contest = await db.contests.find_one({"_id": ObjectId(contest_id)})
    if not contest:
        raise HTTPException(status_code=404, detail="Contest not found")
    
    update_data = contest_data.model_dump(exclude_unset=True)
    update_data["updated_at"] = datetime.utcnow()
    
    await db.contests.update_one(
        {"_id": ObjectId(contest_id)},
        {"$set": update_data}
    )
    
    updated = await db.contests.find_one({"_id": ObjectId(contest_id)})
    return ContestResponse(
        id=str(updated["_id"]),
        name=updated["name"],
        description=updated["description"],
        start_time=updated["start_time"],
        end_time=updated["end_time"],
        settings=updated["settings"],
        status=updated["status"],
        executable_url=updated.get("executable_url"),
        executable_name=updated.get("executable_name"),
        created_by=str(updated["created_by"]),
        created_at=updated["created_at"],
        updated_at=updated["updated_at"]
    )


@router.delete("/{contest_id}")
async def delete_contest(
    contest_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_admin: dict = Depends(get_current_active_admin)
):
    result = await db.contests.delete_one({"_id": ObjectId(contest_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Contest not found")
    
    # Clean up related data
    await db.problems.delete_many({"contest_id": ObjectId(contest_id)})
    await db.hidden_testcases.delete_many({"problem_id": {"$in": [ObjectId(contest_id)]}})
    await db.participants.delete_many({"contest_id": ObjectId(contest_id)})
    await db.submissions.delete_many({"contest_id": ObjectId(contest_id)})
    await db.leaderboard.delete_many({"contest_id": ObjectId(contest_id)})
    
    return {"message": "Contest deleted successfully"}


@router.post("/{contest_id}/start")
async def start_contest(
    contest_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_admin: dict = Depends(get_current_active_admin)
):
    contest = await db.contests.find_one({"_id": ObjectId(contest_id)})
    if not contest:
        raise HTTPException(status_code=404, detail="Contest not found")
    
    if contest["status"] != "draft":
        raise HTTPException(status_code=400, detail="Contest can only be started from draft status")
    
    await db.contests.update_one(
        {"_id": ObjectId(contest_id)},
        {"$set": {"status": "running", "updated_at": datetime.utcnow()}}
    )
    
    return {"message": "Contest started", "status": "running"}


@router.post("/{contest_id}/end")
async def end_contest(
    contest_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_admin: dict = Depends(get_current_active_admin)
):
    contest = await db.contests.find_one({"_id": ObjectId(contest_id)})
    if not contest:
        raise HTTPException(status_code=404, detail="Contest not found")
    
    if contest["status"] != "running":
        raise HTTPException(status_code=400, detail="Contest can only be ended from running status")
    
    await db.contests.update_one(
        {"_id": ObjectId(contest_id)},
        {"$set": {"status": "ended", "updated_at": datetime.utcnow()}}
    )
    
    return {"message": "Contest ended", "status": "ended"}


@router.post("/{contest_id}/executable")
async def upload_executable(
    contest_id: str,
    file: UploadFile = File(...),
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_admin: dict = Depends(get_current_active_admin)
):
    contest = await db.contests.find_one({"_id": ObjectId(contest_id)})
    if not contest:
        raise HTTPException(status_code=404, detail="Contest not found")
    
    # Validate file extension
    allowed_extensions = [".exe", ".out", ".bin"]
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in allowed_extensions:
        raise HTTPException(status_code=400, detail=f"Invalid file type. Allowed: {allowed_extensions}")
    
    # Save file
    upload_dir = settings.UPLOAD_DIR
    os.makedirs(upload_dir, exist_ok=True)
    
    file_path = os.path.join(upload_dir, f"{contest_id}_{file.filename}")
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Update contest
    await db.contests.update_one(
        {"_id": ObjectId(contest_id)},
        {"$set": {
            "executable_url": f"/api/contests/{contest_id}/executable/download",
            "executable_name": file.filename,
            "updated_at": datetime.utcnow()
        }}
    )
    
    # Update problem with executable name
    await db.problems.update_one(
        {"contest_id": ObjectId(contest_id)},
        {"$set": {"executable_name": file.filename, "updated_at": datetime.utcnow()}}
    )
    
    return {"message": "Executable uploaded", "filename": file.filename}


@router.get("/{contest_id}/executable/download")
async def download_executable(
    contest_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    contest = await db.contests.find_one({"_id": ObjectId(contest_id)})
    if not contest or not contest.get("executable_name"):
        raise HTTPException(status_code=404, detail="Executable not found")
    
    file_path = os.path.join(settings.UPLOAD_DIR, f"{contest_id}_{contest['executable_name']}")
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Executable file not found")
    
    from fastapi.responses import FileResponse
    return FileResponse(
        file_path,
        filename=contest["executable_name"],
        media_type="application/octet-stream"
    )


@router.get("/public/active")
async def list_active_contests(db: AsyncIOMotorDatabase = Depends(get_database)):
    contests = await db.contests.find({"status": "running"}).sort("start_time", -1).to_list(100)
    return [
        {
            "id": str(c["_id"]),
            "name": c["name"],
            "start_time": c["start_time"],
            "end_time": c["end_time"]
        }
        for c in contests
    ]


@router.get("/{contest_id}/status", response_model=ContestStatusResponse)
async def get_contest_status(
    contest_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    contest = await db.contests.find_one({"_id": ObjectId(contest_id)})
    if not contest:
        raise HTTPException(status_code=404, detail="Contest not found")
    
    now = datetime.utcnow()
    is_active = contest["status"] == "running" and contest["start_time"] <= now <= contest["end_time"]
    
    time_remaining = None
    if contest["status"] == "running" and now < contest["end_time"]:
        time_remaining = int((contest["end_time"] - now).total_seconds())
    
    return ContestStatusResponse(
        contest_id=contest_id,
        status=contest["status"],
        start_time=contest["start_time"],
        end_time=contest["end_time"],
        is_active=is_active,
        time_remaining=time_remaining
    )


@router.get("/{contest_id}/participants")
async def list_participants(
    contest_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_admin: dict = Depends(get_current_active_admin)
):
    participants = await db.participants.find({"contest_id": ObjectId(contest_id)}).to_list(1000)
    return [
        {
            "id": str(p["_id"]),
            "name": p["name"],
            "roll_number": p["roll_number"],
            "department": p["department"],
            "joined_at": p["joined_at"],
            "is_active": p["is_active"]
        }
        for p in participants
    ]


@router.get("/{contest_id}/submissions")
async def list_submissions(
    contest_id: str,
    verdict: Optional[str] = None,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_admin: dict = Depends(get_current_active_admin)
):
    query = {"contest_id": ObjectId(contest_id)}
    if verdict:
        query["verdict"] = verdict
    
    submissions = await db.submissions.find(query).sort("submitted_at", -1).to_list(500)
    
    # Get participant info
    participant_ids = [s["participant_id"] for s in submissions]
    participants = await db.participants.find({"_id": {"$in": participant_ids}}).to_list(1000)
    participant_map = {str(p["_id"]): p for p in participants}
    
    return [
        {
            "id": str(s["_id"]),
            "participant_name": participant_map.get(str(s["participant_id"]), {}).get("name", "Unknown"),
            "roll_number": participant_map.get(str(s["participant_id"]), {}).get("roll_number", "Unknown"),
            "verdict": s["verdict"],
            "passed_test_cases": s["passed_test_cases"],
            "total_test_cases": s["total_test_cases"],
            "execution_time": s.get("execution_time"),
            "submitted_at": s["submitted_at"]
        }
        for s in submissions
    ]