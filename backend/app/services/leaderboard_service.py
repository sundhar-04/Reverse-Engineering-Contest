from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from datetime import datetime


async def update_leaderboard(contest_id: str, db: AsyncIOMotorDatabase):
    """Recalculate and cache leaderboard for a contest"""
    pipeline = [
        {"$match": {"contest_id": ObjectId(contest_id), "is_custom_run": False}},
        {"$lookup": {
            "from": "participants",
            "localField": "participant_id",
            "foreignField": "_id",
            "as": "participant"
        }},
        {"$unwind": "$participant"},
        {"$sort": {"submitted_at": 1}},
        {"$group": {
            "_id": "$participant_id",
            "name": {"$first": "$participant.name"},
            "rollNumber": {"$first": "$participant.roll_number"},
            "department": {"$first": "$participant.department"},
            "attempts": {"$sum": 1},
            "lastSubmissionTime": {"$last": "$submitted_at"},
            "acceptedSubmissions": {
                "$push": {
                    "verdict": "$verdict",
                    "submittedAt": "$submitted_at"
                }
            }
        }}
    ]
    
    results = await db.submissions.aggregate(pipeline).to_list(1000)
    
    leaderboard_entries = []
    for p in results:
        accepted = any(s["verdict"] == "accepted" for s in p["acceptedSubmissions"])
        accepted_at = None
        if accepted:
            accepted_subs = [s for s in p["acceptedSubmissions"] if s["verdict"] == "accepted"]
            if accepted_subs:
                accepted_at = accepted_subs[0]["submittedAt"]
        
        leaderboard_entries.append({
            "contest_id": ObjectId(contest_id),
            "participant_id": p["_id"],
            "participant_name": p["name"],
            "roll_number": p["rollNumber"],
            "department": p["department"],
            "is_accepted": accepted,
            "attempts": p["attempts"],
            "last_submission_time": p["lastSubmissionTime"],
            "accepted_at": accepted_at,
            "updated_at": datetime.utcnow()
        })
    
    # Sort: accepted first, then by fewest attempts, then by earliest last submission
    leaderboard_entries.sort(key=lambda x: (
        not x["is_accepted"],
        x["attempts"] if x["is_accepted"] else 0,
        x["last_submission_time"] if x["is_accepted"] else datetime.max
    ))
    
    # Assign ranks
    for i, entry in enumerate(leaderboard_entries, 1):
        entry["rank"] = i
    
    # Clear old leaderboard and insert new
    await db.leaderboard.delete_many({"contest_id": ObjectId(contest_id)})
    if leaderboard_entries:
        await db.leaderboard.insert_many(leaderboard_entries)


async def get_leaderboard(contest_id: str, db: AsyncIOMotorDatabase) -> list:
    """Get current leaderboard"""
    entries = await db.leaderboard.find(
        {"contest_id": ObjectId(contest_id)}
    ).sort("rank", 1).to_list(1000)
    
    return [
        {
            "id": str(e["_id"]),
            "rank": e["rank"],
            "name": e["participant_name"],
            "roll_number": e["roll_number"],
            "department": e["department"],
            "is_accepted": e["is_accepted"],
            "attempts": e["attempts"],
            "last_submission_time": e["last_submission_time"].isoformat() if e.get("last_submission_time") else None,
            "accepted_at": e["accepted_at"].isoformat() if e.get("accepted_at") else None
        }
        for e in entries
    ]