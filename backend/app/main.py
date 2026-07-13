import asyncio
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import get_settings
from app.core.database import connect_to_mongo, close_mongo_connection
from app.api.v1 import auth, contests, participants, problems, testcases, submissions, leaderboard, admin, execution

settings = get_settings()


_worker_tasks: list[asyncio.Task] = []


async def _start_inprocess_worker(worker_index: int):
    from app.workers.judge_worker import worker_loop
    worker_id = os.environ.get("WORKER_ID", f"inprocess-{worker_index}")
    os.environ["WORKER_ID"] = worker_id
    print(f"[main] Starting in-process worker ({worker_id})...")
    try:
        await worker_loop()
    except asyncio.CancelledError:
        pass
    except Exception as e:
        print(f"[main] In-process worker ({worker_id}) exited: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _worker_tasks
    # Startup
    await connect_to_mongo()
    worker_count = int(os.environ.get("INPROCESS_WORKER_COUNT", "4"))
    if os.environ.get("ENABLE_INPROCESS_WORKER", "1") == "1":
        for i in range(worker_count):
            task = asyncio.create_task(_start_inprocess_worker(i))
            _worker_tasks.append(task)
    yield
    # Shutdown
    for task in _worker_tasks:
        task.cancel()
    await asyncio.gather(*_worker_tasks, return_exceptions=True)
    await close_mongo_connection()


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    debug=settings.DEBUG,
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(contests.router, prefix="/api/contests", tags=["Contests"])
app.include_router(participants.router, prefix="/api/participants", tags=["Participants"])
app.include_router(problems.router, prefix="/api/problems", tags=["Problems"])
app.include_router(testcases.router, prefix="/api/testcases", tags=["Test Cases"])
app.include_router(submissions.router, prefix="/api/submissions", tags=["Submissions"])
app.include_router(leaderboard.router, prefix="/api/leaderboard", tags=["Leaderboard"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])
app.include_router(execution.router, prefix="/api/execute", tags=["Execution"])

# WebSocket
from app.api.websocket import router as ws_router
app.include_router(ws_router)


@app.get("/")
async def root():
    return {
        "message": "Welcome to ReverseCode Arena API",
        "version": settings.APP_VERSION,
        "docs": "/docs"
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}