from typing import List, Optional, Any, Dict
from app.models.submission import FailedTestCase
from app.services.execution_service import execute_code
from app.core.config import settings


def get_tc_value(tc: Any, key: str):
    if isinstance(tc, dict):
        return tc.get(key, tc.get(key.replace("_", ""), ""))
    return getattr(tc, key, "")


async def judge_submission(
    code: str,
    test_cases: List[Any],
    time_limit: int,
    memory_limit: int
) -> dict:
    """
    Judge a submission against hidden test cases
    Returns verdict and details
    """
    passed = 0
    total = len(test_cases)
    execution_time = 0
    memory_used = 0.0
    failed_test_case = None
    
    for tc in test_cases:
        tc_input = get_tc_value(tc, "input_data") or get_tc_value(tc, "input")
        tc_expected = get_tc_value(tc, "expected_output") or get_tc_value(tc, "output")
        tc_order = get_tc_value(tc, "test_order") or 0
        tc_id = get_tc_value(tc, "id") or get_tc_value(tc, "_id") or ""
        
        result = await execute_code(
            code=code,
            input_data=tc_input,
            time_limit=time_limit,
            memory_limit=memory_limit
        )
        
        execution_time += result.get("runtime_ms", 0)
        memory_used = max(memory_used, result.get("memory_mb", 0))
        
        if result["status"] != "success":
            verdict = map_status_to_verdict(result["status"])
            failed_test_case = FailedTestCase(
                test_case_id=str(tc_id) if tc_id else None,
                input=tc_input,
                expected_output=tc_expected,
                actual_output=result.get("stderr", "") or result.get("stdout", ""),
                test_order=tc_order
            )
            break
        
        actual = result.get("stdout", "").strip()
        expected = tc_expected.strip()
        
        if actual == expected:
            passed += 1
        else:
            verdict = "wrong_answer"
            failed_test_case = FailedTestCase(
                test_case_id=str(tc_id) if tc_id else None,
                input=tc_input,
                expected_output=tc_expected,
                actual_output=actual,
                test_order=tc_order
            )
            break
    else:
        # All passed
        verdict = "accepted"
    
    return {
        "verdict": verdict,
        "passed_test_cases": passed,
        "total_test_cases": total,
        "failed_test_case": failed_test_case,
        "execution_time": execution_time,
        "memory_used": memory_used
    }


def map_status_to_verdict(status: str) -> str:
    mapping = {
        "timeout": "time_limit_exceeded",
        "memory_limit": "memory_limit_exceeded",
        "runtime_error": "runtime_error",
        "compile_error": "compile_error",
        "success": "accepted"
    }
    return mapping.get(status, "runtime_error")