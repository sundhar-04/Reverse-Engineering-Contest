from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from datetime import datetime


async def update_leaderboard(contest_id: str, db: AsyncIOMotorDatabase):
    """Recalculate and cache leaderboard for a contest with per-problem scoring"""
    # Get all problems and their scores
    problems = await db.problems.find(
        {"contest_id": ObjectId(contest_id), "is_active": True}
    ).to_list(100)
    problem_scores = {str(p["_id"]): p.get("score", 100) for p in problems}
    max_score = sum(problem_scores.values())
    total_problems = len(problems)

    # Get all non-custom-run submissions, latest first per (participant, problem)
    pipeline = [
        {"$match": {"contest_id": ObjectId(contest_id), "is_custom_run": False}},
        {"$lookup": {
            "from": "participants",
            "localField": "participant_id",
            "foreignField": "_id",
            "as": "participant"
        }},
        {"$unwind": "$participant"},
        {"$sort": {"submitted_at": -1}},
        {"$group": {
            "_id": {
                "participant_id": "$participant_id",
                "problem_id": "$problem_id"
            },
            "participant_name": {"$first": "$participant.name"},
            "roll_number": {"$first": "$participant.roll_number"},
            "department": {"$first": "$participant.department"},
            "verdict": {"$first": "$verdict"},
            "attempts": {"$sum": 1},
            "last_submitted": {"$first": "$submitted_at"}
        }},
        {"$group": {
            "_id": "$_id.participant_id",
            "participant_name": {"$first": "$participant_name"},
            "roll_number": {"$first": "$roll_number"},
            "department": {"$first": "$department"},
            "problems": {
                "$push": {
                    "problem_id": "$_id.problem_id",
                    "verdict": "$verdict",
                    "attempts": "$attempts",
                    "last_submitted": "$last_submitted"
                }
            },
            "total_attempts": {"$sum": "$attempts"},
            "last_activity": {"$max": "$last_submitted"}
        }}
    ]

    results = await db.submissions.aggregate(pipeline).to_list(1000)

    leaderboard_entries = []
    for p in results:
        solved_count = 0
        total_score = 0
        participant_problems = {}

        for prob in p["problems"]:
            pid = str(prob["problem_id"])
            participant_problems[pid] = {
                "verdict": prob["verdict"],
                "attempts": prob["attempts"]
            }
            if prob["verdict"] == "accepted":
                solved_count += 1
                total_score += problem_scores.get(pid, 100)

        leaderboard_entries.append({
            "contest_id": ObjectId(contest_id),
            "participant_id": p["_id"],
            "participant_name": p["participant_name"],
            "roll_number": p["roll_number"],
            "department": p["department"],
            "total_score": total_score,
            "max_score": max_score,
            "solved_count": solved_count,
            "total_problems": total_problems,
            "attempts": p["total_attempts"],
            "last_submission_time": p["last_activity"],
            "updated_at": datetime.utcnow()
        })

    # Sort: total_score DESC, solved_count DESC, attempts ASC, last_submission ASC
    leaderboard_entries.sort(key=lambda x: (
        -x["total_score"],
        -x["solved_count"],
        x["attempts"],
        x["last_submission_time"] or datetime.max
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
            "total_score": e.get("total_score", 0),
            "max_score": e.get("max_score", 0),
            "solved_count": e.get("solved_count", 0),
            "total_problems": e.get("total_problems", 0),
            "attempts": e["attempts"],
            "last_submission_time": e["last_submission_time"].isoformat() if e.get("last_submission_time") else None
        }
        for e in entries
    ]
