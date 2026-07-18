import json
import uuid
from typing import Optional
from app.core.config import settings
import redis.asyncio as aioredis


REDIS_URL = settings.REDIS_URL
QUEUE_KEY = "judge:queue"
JOB_PREFIX = "judge:job:"


async def get_redis() -> aioredis.Redis:
    return aioredis.from_url(REDIS_URL, decode_responses=True)


async def enqueue_submission(
    submission_id: str,
    code: str,
    test_cases: list,
    time_limit: int,
    memory_limit: int,
    language: str = "python",
) -> str:
    job_id = str(uuid.uuid4())
    job = {
        "job_id": job_id,
        "submission_id": submission_id,
        "code": code,
        "test_cases": test_cases,
        "time_limit": time_limit,
        "memory_limit": memory_limit,
        "language": language,
    }
    r = await get_redis()
    await r.rpush(QUEUE_KEY, json.dumps(job))
    await r.hset(f"{JOB_PREFIX}{job_id}", mapping={
        "status": "queued",
        "submission_id": submission_id,
    })
    await r.expire(f"{JOB_PREFIX}{job_id}", 3600)
    await r.aclose()
    return job_id


async def get_job_status(job_id: str) -> Optional[dict]:
    r = await get_redis()
    data = await r.hgetall(f"{JOB_PREFIX}{job_id}")
    await r.aclose()
    if not data:
        return None
    return data


async def update_job_status(job_id: str, **kwargs):
    r = await get_redis()
    await r.hset(f"{JOB_PREFIX}{job_id}", mapping=kwargs)
    await r.aclose()
