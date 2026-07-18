import asyncio
import os
import resource
import signal
import tempfile
import time
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="Python Sandbox")


class ExecRequest(BaseModel):
    code: str
    input_data: str = ""
    time_limit: int = 2
    memory_limit: int = 256


class ExecResponse(BaseModel):
    stdout: str
    stderr: str
    runtime_ms: int
    memory_mb: float
    status: str


def set_limits(time_limit: int, memory_limit: int):
    mem_bytes = memory_limit * 1024 * 1024
    resource.setrlimit(resource.RLIMIT_CPU, (time_limit, time_limit + 1))
    resource.setrlimit(resource.RLIMIT_AS, (mem_bytes, mem_bytes))
    resource.setrlimit(resource.RLIMIT_NPROC, (50, 50))
    resource.setrlimit(resource.RLIMIT_FSIZE, (1024 * 1024, 1024 * 1024))


async def get_memory_usage(pid: int) -> float:
    try:
        with open(f'/proc/{pid}/status') as f:
            for line in f:
                if line.startswith('VmRSS:'):
                    return int(line.split()[1]) / 1024
    except Exception:
        pass
    return 0.0


@app.post("/execute", response_model=ExecResponse)
async def execute_code(req: ExecRequest):
    start = time.time()

    fd, code_path = tempfile.mkstemp(suffix='.py')
    os.close(fd)
    with open(code_path, 'w') as f:
        f.write(req.code)

    try:
        proc = await asyncio.create_subprocess_exec(
            'python3', '-u', code_path,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            preexec_fn=lambda: set_limits(req.time_limit, req.memory_limit),
        )

        try:
            input_data = req.input_data.encode() if req.input_data else None
            stdout, stderr = await asyncio.wait_for(
                proc.communicate(input=input_data),
                timeout=req.time_limit + 2,
            )
            runtime_ms = int((time.time() - start) * 1000)
            memory_mb = await get_memory_usage(proc.pid) if proc.returncode is not None else 0.0

            if proc.returncode == 0:
                status = "success"
            elif proc.returncode == -signal.SIGXCPU or proc.returncode == -signal.SIGKILL:
                status = "timeout"
            elif proc.returncode == -signal.SIGSEGV:
                status = "memory_limit"
            else:
                status = "runtime_error"

            return ExecResponse(
                stdout=stdout.decode('utf-8', errors='replace'),
                stderr=stderr.decode('utf-8', errors='replace'),
                runtime_ms=runtime_ms,
                memory_mb=memory_mb,
                status=status,
            )

        except asyncio.TimeoutError:
            try:
                proc.kill()
            except ProcessLookupError:
                pass
            stdout, stderr = await proc.communicate()
            return ExecResponse(
                stdout="",
                stderr="Time Limit Exceeded",
                runtime_ms=req.time_limit * 1000,
                memory_mb=0,
                status="timeout",
            )

    finally:
        try:
            os.unlink(code_path)
        except OSError:
            pass


@app.get("/health")
async def health():
    return {"status": "healthy"}
