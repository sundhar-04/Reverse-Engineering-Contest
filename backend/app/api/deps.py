from typing import Generator, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from motor.motor_asyncio import AsyncIOMotorDatabase
from jose import jwt, JWTError
from app.core.config import get_settings
from app.core.database import get_database
from app.core.security import decode_access_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


async def get_current_admin(
    token: str = Depends(oauth2_scheme),
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> dict:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception
    
    username: str = payload.get("sub")
    if username is None:
        raise credentials_exception
    
    admin = await db.admins.find_one({"username": username})
    if admin is None:
        raise credentials_exception
    
    return admin


async def get_current_active_admin(
    current_admin: dict = Depends(get_current_admin)
) -> dict:
    if not current_admin.get("is_active", True):
        raise HTTPException(status_code=400, detail="Inactive admin")
    return current_admin


async def get_optional_admin(
    token: Optional[str] = Depends(oauth2_scheme),
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> Optional[dict]:
    if not token:
        return None
    try:
        payload = decode_access_token(token)
        if payload:
            username = payload.get("sub")
            if username:
                admin = await db.admins.find_one({"username": username})
                return admin
    except JWTError:
        pass
    return None


def require_admin_role(required_role: str = "admin"):
    async def role_checker(admin: dict = Depends(get_current_active_admin)) -> dict:
        if admin.get("role") != required_role and admin.get("role") != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions"
            )
        return admin
    return role_checker