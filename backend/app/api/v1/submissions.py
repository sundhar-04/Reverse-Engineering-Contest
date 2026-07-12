from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List
from bson import ObjectId
from datetime import datetime
from app.api.deps import get_database
from app.models.submission import (
    SubmissionCreate, SubmissionResponse, RunCodeRequest, RunCodeResponse,
    SubmitCodeRequest, SubmitCodeResponse, FailedTestCase,
    QueueSubmitResponse, JobStatusResponse,
)
from app.services.execution_service import execute_code
from app.services.judge_service import judge_submission
from app.services.queue_service import enqueue_submission, get_job_status

router = APIRouter()


@router.post("/run", response_model=RunCodeResponse)
async def run_code(
    request: RunCodeRequest,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    # Verify participant exists
    participant = await db.participants.find_one({"_id": ObjectId(request.participant_id)})
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found")
    
    # Verify problem exists
    problem = await db.problems.find_one({"_id": ObjectId(request.problem_id)})
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    # Execute code in sandbox
    result = await execute_code(
        code=request.code,
        input_data=request.input,
        time_limit=request.time_limit,
        memory_limit=request.memory_limit
    )
    
    # Store submission as custom run
    submission_doc = {
        "participant_id": ObjectId(request.participant_id),
        "problem_id": ObjectId(request.problem_id),
        "contest_id": participant["contest_id"],
        "code": request.code,
        "language": "python",
        "custom_input": request.input,
        "custom_output": result.get("stdout", ""),
        "custom_error": result.get("stderr", ""),
        "custom_runtime": result.get("runtime_ms", 0),
        "custom_status": result.get("status", "error"),
        "custom_memory": result.get("memory_mb", 0),
        "verdict": "pending",
        "is_custom_run": True,
        "submitted_at": datetime.utcnow()
    }
    await db.submissions.insert_one(submission_doc)
    
    return RunCodeResponse(
        stdout=result.get("stdout", ""),
        stderr=result.get("stderr", ""),
        runtime_ms=result.get("runtime_ms", 0),
        memory_mb=result.get("memory_mb", 0),
        status=result.get("status", "error")
    )


@router.post("/submit", response_model=SubmitCodeResponse)
async def submit_code(
    request: SubmitCodeRequest,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    # Verify participant exists
    participant = await db.participants.find_one({"_id": ObjectId(request.participant_id)})
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found")
    
    # Verify problem exists
    problem = await db.problems.find_one({"_id": ObjectId(request.problem_id)})
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    # Check if contest is running
    contest = await db.contests.find_one({"_id": participant["contest_id"]})
    if not contest or contest["status"] != "running":
        raise HTTPException(status_code=400, detail="Contest is not running")
    
    # Get hidden test cases
    testcases = await db.hidden_testcases.find(
        {"problem_id": ObjectId(request.problem_id), "is_sample": False}
    ).sort("test_order", 1).to_list(1000)
    
    if not testcases:
        raise HTTPException(status_code=400, detail="No hidden test cases available")
    
    # Store submission as pending
    submission_doc = {
        "participant_id": ObjectId(request.participant_id),
        "problem_id": ObjectId(request.problem_id),
        "contest_id": participant["contest_id"],
        "code": request.code,
        "language": "python",
        "verdict": "running",
        "is_custom_run": False,
        "submitted_at": datetime.utcnow()
    }
    result = await db.submissions.insert_one(submission_doc)
    submission_id = str(result.inserted_id)
    
    # Judge the submission
    judge_result = await judge_submission(
        code=request.code,
        test_cases=testcases,
        time_limit=problem["time_limit"],
        memory_limit=problem["memory_limit"]
    )
    
    # Update submission with results
    update_doc = {
        "verdict": judge_result["verdict"],
        "passed_test_cases": judge_result["passed_test_cases"],
        "total_test_cases": judge_result["total_test_cases"],
        "execution_time": judge_result["execution_time"],
        "memory_used": judge_result["memory_used"],
        "judged_at": datetime.utcnow()
    }
    
    if judge_result["failed_test_case"]:
        f = judge_result["failed_test_case"]
        update_doc["failed_test_case"] = {
            "test_case_id": f.test_case_id,
            "input": f.input,
            "expected_output": f.expected_output,
            "actual_output": f.actual_output,
            "test_order": f.test_order
        }
    
    await db.submissions.update_one(
        {"_id": ObjectId(submission_id)},
        {"$set": update_doc}
    )
    
    # Update leaderboard
    from app.services.leaderboard_service import update_leaderboard
    await update_leaderboard(str(participant["contest_id"]), db)
    
    # Broadcast leaderboard update via WebSocket
    from app.core.websocket import manager
    leaderboard = await get_leaderboard(str(participant["contest_id"]), db)
    await manager.broadcast_to_contest(str(participant["contest_id"]), {
        "type": "leaderboard_update",
        "data": leaderboard,
        "trigger": {
            "participantId": request.participant_id,
            "verdict": judge_result["verdict"],
            "timestamp": datetime.utcnow().isoformat()
        }
    })
    
    return SubmitCodeResponse(
        verdict=judge_result["verdict"],
        passed_test_cases=judge_result["passed_test_cases"],
        total_test_cases=judge_result["total_test_cases"],
        failed_test_case=judge_result["failed_test_case"],
        execution_time=judge_result["execution_time"],
        memory_used=judge_result["memory_used"]
    )


@router.post("/submit-queue", response_model=QueueSubmitResponse)
async def submit_code_queue(
    request: SubmitCodeRequest,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    participant = await db.participants.find_one({"_id": ObjectId(request.participant_id)})
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found")

    problem = await db.problems.find_one({"_id": ObjectId(request.problem_id)})
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")

    contest = await db.contests.find_one({"_id": participant["contest_id"]})
    if not contest or contest["status"] != "running":
        raise HTTPException(status_code=400, detail="Contest is not running")

    testcases = await db.hidden_testcases.find(
        {"problem_id": ObjectId(request.problem_id), "is_sample": False}
    ).sort("test_order", 1).to_list(1000)

    if not testcases:
        raise HTTPException(status_code=400, detail="No hidden test cases available")

    serialized_testcases = []
    for tc in testcases:
        serialized_testcases.append({
            "id": str(tc["_id"]),
            "input_data": tc.get("input_data", tc.get("input", "")),
            "expected_output": tc.get("expected_output", tc.get("output", "")),
            "test_order": tc.get("test_order", 0),
        })

    submission_doc = {
        "participant_id": ObjectId(request.participant_id),
        "problem_id": ObjectId(request.problem_id),
        "contest_id": participant["contest_id"],
        "code": request.code,
        "language": "python",
        "verdict": "pending",
        "queue_status": "queued",
        "is_custom_run": False,
        "submitted_at": datetime.utcnow(),
    }
    result = await db.submissions.insert_one(submission_doc)
    submission_id = str(result.inserted_id)

    job_id = await enqueue_submission(
        submission_id=submission_id,
        code=request.code,
        test_cases=serialized_testcases,
        time_limit=problem.get("time_limit", 2),
        memory_limit=problem.get("memory_limit", 256),
    )

    await db.submissions.update_one(
        {"_id": ObjectId(submission_id)},
        {"$set": {"job_id": job_id, "verdict": "queued"}},
    )

    return QueueSubmitResponse(
        submission_id=submission_id,
        job_id=job_id,
        queue_status="queued",
    )


@router.get("/queue-status/{job_id}", response_model=JobStatusResponse)
async def get_queue_status(job_id: str):
    status = await get_job_status(job_id)
    if not status:
        raise HTTPException(status_code=404, detail="Job not found")

    return JobStatusResponse(
        job_id=job_id,
        status=status.get("status", "unknown"),
        submission_id=status.get("submission_id"),
        verdict=status.get("verdict"),
        passed=int(status["passed"]) if status.get("passed") else None,
        total=int(status["total"]) if status.get("total") else None,
        error=status.get("error"),
    )


@router.get("/participant/{participant_id}", response_model=List[SubmissionResponse])
async def list_submissions(
    participant_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    submissions = await db.submissions.find(
        {"participant_id": ObjectId(participant_id), "is_custom_run": False}
    ).sort("submitted_at", -1).to_list(100)
    
    return [
        SubmissionResponse(
            id=str(s["_id"]),
            participant_id=str(s["participant_id"]),
            problem_id=str(s["problem_id"]),
            contest_id=str(s["contest_id"]),
            code=s["code"],
            language=s["language"],
            is_custom_run=s.get("is_custom_run", False),
            custom_input=s.get("custom_input", ""),
            custom_output=s.get("custom_output"),
            custom_error=s.get("custom_error"),
            custom_runtime=s.get("custom_runtime"),
            custom_status=s.get("custom_status"),
            custom_memory=s.get("custom_memory"),
            job_id=s.get("job_id"),
            queue_status=s.get("queue_status", "pending"),
            verdict=s["verdict"],
            failed_test_case=FailedTestCase(**s["failed_test_case"]) if s.get("failed_test_case") else None,
            passed_test_cases=s.get("passed_test_cases", 0),
            total_test_cases=s.get("total_test_cases", 0),
            execution_time=s.get("execution_time"),
            memory_used=s.get("memory_used"),
            submitted_at=s["submitted_at"],
            judged_at=s.get("judged_at")
        )
        for s in submissions
    ]


@router.get("/{submission_id}", response_model=SubmissionResponse)
async def get_submission(
    submission_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    submission = await db.submissions.find_one({"_id": ObjectId(submission_id)})
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    return SubmissionResponse(
        id=str(submission["_id"]),
        participant_id=str(submission["participant_id"]),
        problem_id=str(submission["problem_id"]),
        contest_id=str(submission["contest_id"]),
        code=submission["code"],
        language=submission["language"],
        is_custom_run=submission.get("is_custom_run", False),
        custom_input=submission.get("custom_input", ""),
        custom_output=submission.get("custom_output"),
        custom_error=submission.get("custom_error"),
        custom_runtime=submission.get("custom_runtime"),
        custom_status=submission.get("custom_status"),
        custom_memory=submission.get("custom_memory"),
        job_id=submission.get("job_id"),
        queue_status=submission.get("queue_status", "pending"),
        verdict=submission["verdict"],
        failed_test_case=FailedTestCase(**submission["failed_test_case"]) if submission.get("failed_test_case") else None,
        passed_test_cases=submission.get("passed_test_cases", 0),
        total_test_cases=submission.get("total_test_cases", 0),
        execution_time=submission.get("execution_time"),
        memory_used=submission.get("memory_used"),
        submitted_at=submission["submitted_at"],
        judged_at=submission.get("judged_at")
    )


async def get_leaderboard(contest_id: str, db: AsyncIOMotorDatabase):
    """Get leaderboard entries for a contest"""
    leaderboard = await db.leaderboard.find(
        {"contest_id": ObjectId(contest_id)}
    ).sort("rank", 1).to_list(1000)
    
    return [
        {
            "id": str(entry["_id"]),
            "rank": entry["rank"],
            "name": entry["participant_name"],
            "roll_number": entry["roll_number"],
            "department": entry["department"],
            "total_score": entry.get("total_score", 0),
            "max_score": entry.get("max_score", 0),
            "solved_count": entry.get("solved_count", 0),
            "total_problems": entry.get("total_problems", 0),
            "attempts": entry["attempts"],
            "last_submission_time": entry["last_submission_time"].isoformat() if entry.get("last_submission_time") else None
        }
        for entry in leaderboard
    ]