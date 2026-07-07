import httpx
import asyncio
from app.core.config import settings


async def execute_code(
    code: str,
    input_data: str = "",
    time_limit: int = 2,
    memory_limit: int = 256
) -> dict:
    """
    Execute Python code in the Docker sandbox
    """
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.post(
                f"{settings.SANDBOX_URL}/execute",
                json={
                    "code": code,
                    "input_data": input_data,
                    "time_limit": time_limit,
                    "memory_limit": memory_limit
                }
            )
            response.raise_for_status()
            return response.json()
        except httpx.TimeoutException:
            return {
                "stdout": "",
                "stderr": "Execution timeout",
                "runtime_ms": time_limit * 1000,
                "memory_mb": 0,
                "status": "timeout"
            }
        except httpx.ConnectError:
            return {
                "stdout": "",
                "stderr": "Sandbox service unavailable",
                "runtime_ms": 0,
                "memory_mb": 0,
                "status": "runtime_error"
            }
        except Exception as e:
            return {
                "stdout": "",
                "stderr": str(e),
                "runtime_ms": 0,
                "memory_mb": 0,
                "status": "runtime_error"
            }