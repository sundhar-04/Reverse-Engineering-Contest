# Redis Job Queue Implementation Plan
## Goal: Handle 30+ parallel submissions via Redis queue + worker pool

---

## Architecture Overview

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Frontend   │────▶│  Backend    │────▶│   Redis     │
│  (POST /api │     │  /submit    │     │  Queue      │
│  submissions)│    │  (enqueue)  │     │  (RPUSH)    │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                    ┌──────────────────────────┼──────────────────────────┐
                    ▼                          ▼                          ▼
             ┌─────────────┐            ┌─────────────┐            ┌─────────────┐
             │ Worker 1    │            │ Worker 2    │            │ Worker N    │
             │ (sandbox)   │            │ (sandbox)   │            │ (sandbox)   │
             │ BLPOP queue │            │ BLPOP queue │            │ BLPOP queue │
             └──────┬──────┘            └──────┬──────┘            └──────┬──────┘
                    │                          │                          │
                    └──────────────────────────┼──────────────────────────┘
                                               ▼
                                        ┌─────────────┐
                                        │  MongoDB    │
                                        │  (results)  │
                                        └─────────────┘
```

---

## 1. New Files to Create

### 1.1 `backend/app/services/queue_service.py`
```python
# Redis queue operations
- enqueue_submission(job_data) -> job_id
- get_job_status(job_id) -> status/result
- update_job_status(job_id, status, result)
- worker_loop() - blocking consumer
```

### 1.2 `backend/app/workers/judge_worker.py`
```python
# Standalone worker process
- Consumes jobs from Redis queue
- Runs judge_submission()
- Updates MongoDB + Redis with result
- Handles retries, timeouts
```

### 1.3 `backend/app/api/v1/queue.py` (or extend submissions.py)
```python
# New endpoints
POST   /api/v1/submissions/queue     # Enqueue submission, returns job_id
GET    /api/v1/submissions/queue/{job_id}  # Poll status/result
```

---

## 2. Modified Files

### 2.1 `backend/app/api/v1/submissions.py`
- **Change `submit_code`**: Don't call `judge_submission` inline
- Instead: create submission doc with `verdict="queued"`, enqueue to Redis, return `job_id`
- Add `job_id` to `SubmitCodeResponse`

### 2.2 `backend/app/models/submission.py`
- Add `job_id: Optional[str]` to `SubmissionInDB`
- Add `queue_status: str` field (queued/running/completed/failed)

### 2.4 `backend/app/services/execution_service.py`
- Keep as-is (called by workers)

### 2.5 `docker-compose.yml`
```yaml
# Add worker services (scale as needed)
sandbox-worker-1:
  build: ./docker
  command: python -m app.workers.judge_worker
  deploy:
    resources:
      limits:
        cpus: '1'
        memory: 512M

sandbox-worker-2:
  # ... same

sandbox-worker-3:
  # ... same
```

---

## 3. Redis Queue Schema

### Queue Key: `judge:queue` (Redis List)
```json
// Job payload (RPUSH)
{
  "job_id": "uuid",
  "submission_id": "mongo_id",
  "code": "print('hello')",
  "test_cases": [...],
  "time_limit": 2,
  "memory_limit": 256,
  "language": "python",
  "priority": 0,
  "created_at": "2024-01-15T10:00:00Z"
}
```

### Job Status Key: `judge:job:{job_id}` (Redis Hash)
```json
{
  "status": "queued|running|completed|failed",
  "result": "{...}",  // JSON string of judge result
  "worker_id": "worker-1",
  "started_at": "timestamp",
  "completed_at": "timestamp",
  "retry_count": 0
}
```

---

## 4. Worker Logic

```python
async def worker_loop(worker_id: str):
    while True:
        # Blocking pop with timeout
        job_data = await redis.blpop("judge:queue", timeout=30)
        if not job_data:
            continue
        
        job = json.loads(job_data[1])
        job_id = job["job_id"]
        
        # Mark running
        await redis.hset(f"judge:job:{job_id}", mapping={
            "status": "running",
            "worker_id": worker_id,
            "started_at": datetime.utcnow().isoformat()
        })
        
        try:
            # Run judge
            result = await judge_submission(
                code=job["code"],
                test_cases=job["test_cases"],
                time_limit=job["time_limit"],
                memory_limit=job["memory_limit"]
            )
            
            # Update MongoDB
            await db.submissions.update_one(
                {"_id": ObjectId(job["submission_id"])},
                {"$set": {
                    "verdict": result["verdict"],
                    "passed_test_cases": result["passed_test_cases"],
                    "total_test_cases": result["total_test_cases"],
                    "failed_test_case": result["failed_test_case"],
                    "execution_time": result["execution_time"],
                    "memory_used": result["memory_used"],
                    "judged_at": datetime.utcnow(),
                    "queue_status": "completed"
                }}
            )
            
            # Update Redis job status
            await redis.hset(f"judge:job:{job_id}", mapping={
                "status": "completed",
                "result": json.dumps(result),
                "completed_at": datetime.utcnow().isoformat()
            })
            
        except Exception as e:
            # Handle retries
            retry = int(await redis.hget(f"judge:job:{job_id}", "retry_count") or 0)
            if retry < 3:
                await redis.hincrby(f"judge:job:{job_id}", "retry_count", 1)
                await redis.rpush("judge:queue", json.dumps(job))  # Re-queue
            else:
                await redis.hset(f"judge:job:{job_id}", mapping={
                    "status": "failed",
                    "error": str(e),
                    "completed_at": datetime.utcnow().isoformat()
                })
```

---

## 5. Capacity Calculation

| Workers | Sandbox CPU each | Throughput (submits/min) | VM RAM Used |
|---------|------------------|-------------------------|-------------|
| 2       | 1                | 24-40                   | ~2 GB       |
| 3       | 1                | 36-60                   | ~3 GB       |
| 4       | 1                | 48-80                   | ~4 GB       |

**Recommended for B2as_v2 (8 GB):** 3 workers × 1 CPU = 36-60 submits/min, leaves ~4 GB for MongoDB/Redis/Backend

---

## 6. Deployment Steps

1. Add `queue_service.py` and `judge_worker.py`
2. Modify `submissions.py` to enqueue instead of inline judge
3. Add queue endpoints
4. Update `docker-compose.yml` with 3 worker services
5. Deploy: `docker compose up -d --scale sandbox-worker=3`
6. Test with load generator

---

## 7. Frontend Changes (minimal)

- `SubmitCodeResponse` now returns `job_id` instead of immediate verdict
- Frontend polls `GET /api/v1/submissions/queue/{job_id}` every 1-2s
- On `status=completed`, show verdict

---

## 8. Testing

```bash
# Quick load test
for i in {1..50}; do
  curl -X POST http://localhost:8000/api/v1/submissions/queue \
    -H "Content-Type: application/json" \
    -d '{"code":"print(1)","participant_id":"...","problem_id":"..."}' &
done
```

---

## 9. Rollback Plan

If issues: scale workers to 0, revert `submissions.py` to inline judge, `docker compose up -d`