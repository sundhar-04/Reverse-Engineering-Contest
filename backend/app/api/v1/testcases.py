from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List
from bson import ObjectId
from datetime import datetime
import csv
import io
import json
from app.api.deps import get_database, get_current_active_admin
from app.models.testcase import TestCaseCreate, TestCaseResponse, TestCaseUploadRequest

router = APIRouter()


@router.post("", response_model=TestCaseResponse)
async def create_testcase(
    testcase_data: TestCaseCreate,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_admin: dict = Depends(get_current_active_admin)
):
    # Verify problem exists
    problem = await db.problems.find_one({"_id": ObjectId(testcase_data.problem_id)})
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    testcase_doc = testcase_data.model_dump()
    testcase_doc["problem_id"] = ObjectId(testcase_data.problem_id)
    testcase_doc["created_at"] = datetime.utcnow()
    
    result = await db.hidden_testcases.insert_one(testcase_doc)
    testcase_doc["_id"] = result.inserted_id
    
    return TestCaseResponse(
        id=str(testcase_doc["_id"]),
        input_data=testcase_doc["input_data"],
        expected_output=testcase_doc["expected_output"],
        test_order=testcase_doc["test_order"],
        is_sample=testcase_doc["is_sample"],
        problem_id=str(testcase_doc["problem_id"]),
        created_at=testcase_doc["created_at"]
    )


@router.post("/bulk")
async def upload_testcases_bulk(
    problem_id: str,
    file: UploadFile = File(...),
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_admin: dict = Depends(get_current_active_admin)
):
    # Verify problem exists
    problem = await db.problems.find_one({"_id": ObjectId(problem_id)})
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    content = await file.read()
    
    if file.filename.endswith(".csv"):
        # Parse CSV: input,expected_output,test_order,is_sample
        decoded = content.decode("utf-8")
        reader = csv.DictReader(io.StringIO(decoded))
        testcases = []
        for row in reader:
            testcases.append({
                "problem_id": ObjectId(problem_id),
                "input_data": row.get("input", ""),
                "expected_output": row.get("expected_output", ""),
                "test_order": int(row.get("test_order", 0)),
                "is_sample": row.get("is_sample", "false").lower() == "true",
                "created_at": datetime.utcnow()
            })
    elif file.filename.endswith(".json"):
        # Parse JSON array
        data = json.loads(content)
        testcases = []
        for item in data:
            testcases.append({
                "problem_id": ObjectId(problem_id),
                "input_data": item.get("input", ""),
                "expected_output": item.get("expected_output", ""),
                "test_order": item.get("test_order", 0),
                "is_sample": item.get("is_sample", False),
                "created_at": datetime.utcnow()
            })
    else:
        raise HTTPException(status_code=400, detail="Unsupported file format. Use CSV or JSON")
    
    if testcases:
        await db.hidden_testcases.insert_many(testcases)
    
    return {"message": f"Uploaded {len(testcases)} test cases"}


@router.get("/problem/{problem_id}", response_model=List[TestCaseResponse])
async def list_testcases(
    problem_id: str,
    include_hidden: bool = False,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_admin: dict = Depends(get_current_active_admin)
):
    query = {"problem_id": ObjectId(problem_id)}
    if not include_hidden:
        query["is_sample"] = True
    
    testcases = await db.hidden_testcases.find(query).sort("test_order", 1).to_list(1000)
    return [
        TestCaseResponse(
            id=str(t["_id"]),
            input_data=t["input_data"],
            expected_output=t["expected_output"],
            test_order=t["test_order"],
            is_sample=t["is_sample"],
            problem_id=str(t["problem_id"]),
            created_at=t["created_at"]
        )
        for t in testcases
    ]


@router.delete("/{testcase_id}")
async def delete_testcase(
    testcase_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_admin: dict = Depends(get_current_active_admin)
):
    result = await db.hidden_testcases.delete_one({"_id": ObjectId(testcase_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Test case not found")
    return {"message": "Test case deleted"}