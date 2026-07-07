from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional
from bson import ObjectId
from datetime import datetime
from app.api.deps import get_database
from app.models.participant import JoinContestRequest, JoinContestResponse, ParticipantResponse

router = APIRouter()


@router.post("/join", response_model=JoinContestResponse)
async def join_contest(
    request: JoinContestRequest,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    # Verify contest exists and is active
    contest = await db.contests.find_one({"_id": ObjectId(request.contest_id)})
    if not contest:
        raise HTTPException(status_code=404, detail="Contest not found")
    
    if contest["status"] != "running":
        raise HTTPException(status_code=400, detail="Contest is not running")
    
    # Check if already registered
    existing = await db.participants.find_one({
        "contest_id": ObjectId(request.contest_id),
        "roll_number": request.roll_number
    })
    if existing:
        raise HTTPException(status_code=400, detail="Already registered with this roll number")
    
    # Create participant
    participant_doc = {
        "contest_id": ObjectId(request.contest_id),
        "name": request.name,
        "roll_number": request.roll_number,
        "department": request.department,
        "joined_at": datetime.utcnow(),
        "is_active": True
    }
    result = await db.participants.insert_one(participant_doc)
    
    return JoinContestResponse(
        participant_id=str(result.inserted_id),
        message="Successfully joined the contest"
    )


@router.get("/{participant_id}", response_model=ParticipantResponse)
async def get_participant(
    participant_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    participant = await db.participants.find_one({"_id": ObjectId(participant_id)})
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found")
    
    return ParticipantResponse(
        id=str(participant["_id"]),
        name=participant["name"],
        roll_number=participant["roll_number"],
        department=participant["department"],
        contest_id=str(participant["contest_id"]),
        joined_at=participant["joined_at"],
        is_active=participant["is_active"]
    )


@router.get("/contest/{contest_id}/me")
async def get_my_participation(
    contest_id: str,
    roll_number: str,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    participant = await db.participants.find_one({
        "contest_id": ObjectId(contest_id),
        "roll_number": roll_number
    })
    if not participant:
        raise HTTPException(status_code=404, detail="Not registered for this contest")
    
    return ParticipantResponse(
        id=str(participant["_id"]),
        name=participant["name"],
        roll_number=participant["roll_number"],
        department=participant["department"],
        contest_id=str(participant["contest_id"]),
        joined_at=participant["joined_at"],
        is_active=participant["is_active"]
    )