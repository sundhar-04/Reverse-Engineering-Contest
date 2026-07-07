from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime, timedelta
from typing import Optional
from pydantic import BaseModel
from app.api.deps import get_database, get_current_active_admin
from app.core.security import verify_password, get_password_hash, create_access_token
from app.models.admin import AdminCreate, Token, AdminResponse
from bson import ObjectId


class LoginRequest(BaseModel):
    username: str
    password: str

router = APIRouter()


@router.post("/admin/register", response_model=AdminResponse)
async def register_admin(
    admin_data: AdminCreate,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_admin: dict = Depends(get_current_active_admin)
):
    # Only admins can create other admins
    if current_admin.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only admins can register new admins")
    
    existing = await db.admins.find_one({"username": admin_data.username})
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    hashed_password = get_password_hash(admin_data.password)
    now = datetime.utcnow()
    admin_doc = {
        "username": admin_data.username,
        "email": admin_data.email,
        "password_hash": hashed_password,
        "role": admin_data.role,
        "is_active": True,
        "created_at": now
    }
    result = await db.admins.insert_one(admin_doc)
    admin_doc["_id"] = result.inserted_id
    
    return AdminResponse(
        id=str(admin_doc["_id"]),
        username=admin_doc["username"],
        email=admin_doc["email"],
        role=admin_doc["role"],
        created_at=admin_doc["created_at"],
        is_active=admin_doc["is_active"]
    )


@router.post("/admin/login", response_model=Token)
async def login_admin(
    credentials: LoginRequest,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    admin = await db.admins.find_one({"username": credentials.username})
    if not admin or not verify_password(credentials.password, admin["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not admin.get("is_active", True):
        raise HTTPException(status_code=400, detail="Inactive admin")
    
    access_token = create_access_token(
        data={"sub": admin["username"]},
        expires_delta=timedelta(minutes=60 * 24 * 7)  # 7 days
    )
    
    return Token(access_token=access_token, token_type="bearer")


@router.get("/admin/me", response_model=AdminResponse)
async def get_current_admin_info(current_admin: dict = Depends(get_current_active_admin)):
    return AdminResponse(
        id=str(current_admin["_id"]),
        username=current_admin["username"],
        email=current_admin["email"],
        role=current_admin["role"],
        created_at=current_admin.get("created_at"),
        is_active=current_admin.get("is_active", True)
    )