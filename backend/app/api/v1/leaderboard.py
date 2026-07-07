from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List
from bson import ObjectId
from app.api.deps import get_database
from app.services.leaderboard_service import get_leaderboard as get_lb

router = APIRouter()


@router.get("/contest/{contest_id}")
async def get_leaderboard(
    contest_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    entries = await get_lb(contest_id, db)
    return {
        "contest_id": contest_id,
        "entries": entries,
        "last_updated": entries[0].get("last_submission_time") if entries else None
    }