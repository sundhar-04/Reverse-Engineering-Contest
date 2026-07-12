import asyncio
import json
import os
import signal
import sys
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings
from app.services.execution_service import execute_code
from app.services.judge_service import map_status_to_verdict
from app.models.submission import FailedTestCase
import redis.asyncio as aioredis

REDIS_URL = settings.REDIS_URL
QUEUE_KEY = "judge:queue"
JOB_PREFIX = "judge:job:"
WORKER_ID = os.environ.get("WORKER_ID", f"worker-{os.getpid()}")
SANDBOX_URL = os.environ.get("SANDBOX_URL", settings.SANDBOX_URL)

# Override for worker-specific sandbox
if "SANDBOX_URL_OVERRIDE" in os.environ:
    SANDBOX_URL = os.environ["SANDBOX_URL_OVERRIDE"]


async def get_tc_value(tc, key):
    if isinstance(tc, dict):
        return tc.get(key, tc.get(key.replace("_", ""), ""))
    return getattr(tc, key, "")


async def process_job(job: dict, db):
    job_id = job["job_id"]
    submission_id = job["submission_id"]
    code = job["code"]
    test_cases = job["test_cases"]
    time_limit = job.get("time_limit", 2)
    memory_limit = job.get("memory_limit", 256)

    r = aioredis.from_url(REDIS_URL, decode_responses=True)
    await r.hset(f"{JOB_PREFIX}{job_id}", mapping={
        "status": "running",
        "worker_id": WORKER_ID,
        "started_at": datetime.utcnow().isoformat(),
    })

    passed = 0
    total = len(test_cases)
    execution_time = 0
    memory_used = 0.0
    failed_test_case = None
    verdict = "accepted"

    try:
        for tc in test_cases:
            tc_input = await get_tc_value(tc, "input_data") or await get_tc_value(tc, "input")
            tc_expected = await get_tc_value(tc, "expected_output") or await get_tc_value(tc, "output")
            tc_order = await get_tc_value(tc, "test_order") or 0
            tc_id = str(await get_tc_value(tc, "id") or await get_tc_value(tc, "_id") or "")

            result = await execute_code(
                code=code,
                input_data=tc_input,
                time_limit=time_limit,
                memory_limit=memory_limit,
            )

            execution_time += result.get("runtime_ms", 0)
            memory_used = max(memory_used, result.get("memory_mb", 0))

            if result["status"] != "success":
                verdict = map_status_to_verdict(result["status"])
                failed_test_case = FailedTestCase(
                    test_case_id=tc_id,
                    input=tc_input,
                    expected_output=tc_expected,
                    actual_output=result.get("stderr", "") or result.get("stdout", ""),
                    test_order=tc_order,
                )
                break

            actual = result.get("stdout", "").strip()
            expected = tc_expected.strip()

            if actual == expected:
                passed += 1
            else:
                verdict = "wrong_answer"
                failed_test_case = FailedTestCase(
                    test_case_id=tc_id,
                    input=tc_input,
                    expected_output=tc_expected,
                    actual_output=actual,
                    test_order=tc_order,
                )
                break

        update_doc = {
            "verdict": verdict,
            "passed_test_cases": passed,
            "total_test_cases": total,
            "execution_time": execution_time,
            "memory_used": memory_used,
            "judged_at": datetime.utcnow(),
            "queue_status": "completed",
        }
        if failed_test_case:
            update_doc["failed_test_case"] = {
                "test_case_id": failed_test_case.test_case_id,
                "input": failed_test_case.input,
                "expected_output": failed_test_case.expected_output,
                "actual_output": failed_test_case.actual_output,
                "test_order": failed_test_case.test_order,
            }

        from bson import ObjectId
        await db.submissions.update_one(
            {"_id": ObjectId(submission_id)},
            {"$set": update_doc},
        )

        await r.hset(f"{JOB_PREFIX}{job_id}", mapping={
            "status": "completed",
            "verdict": verdict,
            "passed": str(passed),
            "total": str(total),
            "completed_at": datetime.utcnow().isoformat(),
        })

        # Update leaderboard
        submission = await db.submissions.find_one({"_id": ObjectId(submission_id)})
        if submission and submission.get("contest_id"):
            from app.services.leaderboard_service import update_leaderboard
            await update_leaderboard(str(submission["contest_id"]), db)

            from app.core.websocket import manager
            contest_id = str(submission["contest_id"])
            leaderboard = await db.leaderboard.find(
                {"contest_id": submission["contest_id"]}
            ).sort("rank", 1).to_list(1000)
            lb = [
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
                    "last_submission_time": e["last_submission_time"].isoformat() if e.get("last_submission_time") else None,
                }
                for e in lb
            ]
            await manager.broadcast_to_contest(contest_id, {
                "type": "leaderboard_update",
                "data": lb,
                "trigger": {
                    "participantId": str(submission.get("participant_id", "")),
                    "verdict": verdict,
                    "timestamp": datetime.utcnow().isoformat(),
                },
            })

    except Exception as e:
        await r.hset(f"{JOB_PREFIX}{job_id}", mapping={
            "status": "failed",
            "error": str(e),
            "failed_at": datetime.utcnow().isoformat(),
        })

    finally:
        await r.aclose()


async def worker_loop():
    print(f"[{WORKER_ID}] Starting worker loop...")
    r = aioredis.from_url(REDIS_URL, decode_responses=True)
    mongo_client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = mongo_client[settings.MONGODB_DB_NAME]

    while True:
        try:
            result = await r.blpop(QUEUE_KEY, timeout=30)
            if not result:
                continue

            _, job_data = result
            job = json.loads(job_data)
            print(f"[{WORKER_ID}] Got job {job['job_id']} for submission {job['submission_id']}")
            await process_job(job, db)
            print(f"[{WORKER_ID}] Completed job {job['job_id']}")

        except asyncio.CancelledError:
            break
        except Exception as e:
            print(f"[{WORKER_ID}] Error in worker loop: {e}", file=sys.stderr)
            await asyncio.sleep(1)

    await r.aclose()
    mongo_client.close()


def main():
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        loop.run_until_complete(worker_loop())
    except KeyboardInterrupt:
        pass
    finally:
        loop.close()


if __name__ == "__main__":
    main()
