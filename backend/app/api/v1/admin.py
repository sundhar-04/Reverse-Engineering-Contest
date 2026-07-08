from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional
from bson import ObjectId
from datetime import datetime
from app.api.deps import get_database, get_current_active_admin
from app.services.leaderboard_service import get_leaderboard

router = APIRouter()


@router.get("/contests/{contest_id}/stats")
async def get_contest_stats(
    contest_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_admin: dict = Depends(get_current_active_admin)
):
    contest = await db.contests.find_one({"_id": ObjectId(contest_id)})
    if not contest:
        raise HTTPException(status_code=404, detail="Contest not found")
    
    total_participants = await db.participants.count_documents({"contest_id": ObjectId(contest_id)})
    total_submissions = await db.submissions.count_documents({"contest_id": ObjectId(contest_id), "is_custom_run": False})
    accepted_submissions = await db.submissions.count_documents({"contest_id": ObjectId(contest_id), "verdict": "accepted"})
    
    problems = await db.problems.find({"contest_id": ObjectId(contest_id)}).to_list(100)
    problem_ids = [p["_id"] for p in problems]
    total_testcases = await db.hidden_testcases.count_documents({"problem_id": {"$in": problem_ids}})
    
    return {
        "contest_id": contest_id,
        "total_participants": total_participants,
        "total_submissions": total_submissions,
        "accepted_submissions": accepted_submissions,
        "total_testcases": total_testcases,
        "status": contest["status"]
    }


@router.get("/contests/{contest_id}/participants")
async def admin_list_participants(
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
            "joined_at": p["joined_at"].isoformat(),
            "is_active": p.get("is_active", True)
        }
        for p in participants
    ]


@router.get("/contests/{contest_id}/submissions")
async def admin_list_submissions(
    contest_id: str,
    limit: int = 100,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_admin: dict = Depends(get_current_active_admin)
):
    from app.services.judge_service import map_status_to_verdict
    submissions = await db.submissions.find(
        {"contest_id": ObjectId(contest_id), "is_custom_run": False}
    ).sort("submitted_at", -1).limit(limit).to_list(limit)
    
    # Get participant info
    pids = list(set(s["participant_id"] for s in submissions))
    participants = await db.participants.find({"_id": {"$in": pids}}).to_list(1000)
    p_map = {str(p["_id"]): p for p in participants}
    
    # Get problem info
    prob_ids = list(set(s["problem_id"] for s in submissions))
    problems = await db.problems.find({"_id": {"$in": prob_ids}}).to_list(1000)
    prob_map = {str(p["_id"]): p.get("title", "Unknown") for p in problems}

    return [
        {
            "id": str(s["_id"]),
            "participant_id": str(s["participant_id"]),
            "participant_name": p_map.get(str(s["participant_id"]), {}).get("name", "Unknown"),
            "roll_number": p_map.get(str(s["participant_id"]), {}).get("roll_number", "Unknown"),
            "problem_id": str(s["problem_id"]),
            "problem_title": prob_map.get(str(s["problem_id"]), "Unknown"),
            "verdict": s["verdict"],
            "passed_test_cases": s.get("passed_test_cases", 0),
            "total_test_cases": s.get("total_test_cases", 0),
            "execution_time": s.get("execution_time"),
            "submitted_at": s["submitted_at"].isoformat(),
            "judged_at": s.get("judged_at").isoformat() if s.get("judged_at") else None
        }
        for s in submissions
    ]


@router.get("/contests/{contest_id}/leaderboard")
async def admin_get_leaderboard(
    contest_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_admin: dict = Depends(get_current_active_admin)
):
    entries = await get_leaderboard(contest_id, db)
    return {"contest_id": contest_id, "entries": entries}


@router.get("/contests")
async def admin_list_all_contests(
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_admin: dict = Depends(get_current_active_admin)
):
    contests = await db.contests.find().sort("created_at", -1).to_list(100)
    return [
        {
            "id": str(c["_id"]),
            "name": c["name"],
            "status": c["status"],
            "start_time": c["start_time"].isoformat(),
            "end_time": c["end_time"].isoformat(),
            "created_at": c["created_at"].isoformat(),
            "participant_count": await db.participants.count_documents({"contest_id": c["_id"]}),
            "submission_count": await db.submissions.count_documents({"contest_id": c["_id"], "is_custom_run": False})
        }
        for c in contests
    ]


@router.get("/dashboard")
async def admin_get_dashboard(
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_admin: dict = Depends(get_current_active_admin)
):
    total_contests = await db.contests.count_documents({})
    active_contests = await db.contests.count_documents({"status": "running"})
    total_participants = await db.participants.count_documents({})
    total_submissions = await db.submissions.count_documents({"is_custom_run": False})
    accepted = await db.submissions.count_documents({"verdict": "accepted"})
    
    return {
        "total_contests": total_contests,
        "active_contests": active_contests,
        "total_participants": total_participants,
        "total_submissions": total_submissions,
        "accepted_submissions": accepted
    }