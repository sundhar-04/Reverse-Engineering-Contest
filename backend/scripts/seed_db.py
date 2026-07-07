"""Seed database with initial admin user"""
import asyncio
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from motor.motor_asyncio import AsyncIOMotorClient
from app.core.security import get_password_hash


async def seed():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["reversecode_arena"]
    
    # Create admin user
    existing = await db.admins.find_one({"username": "admin"})
    if not existing:
        await db.admins.insert_one({
            "username": "admin",
            "email": "admin@reversecode.com",
            "password_hash": get_password_hash("admin123"),
            "role": "admin",
            "is_active": True,
            "created_at": datetime.datetime.utcnow()
        })
        print("Admin user created: admin / admin123")
    else:
        print("Admin user already exists")
    
    # Create sample contest
    existing_contest = await db.contests.find_one({"name": "Sample Contest"})
    if not existing_contest:
        from datetime import datetime, timedelta
        admin = await db.admins.find_one({"username": "admin"})
        contest = {
            "name": "Sample Reverse Engineering Contest",
            "description": "A sample contest for testing",
            "start_time": datetime.utcnow(),
            "end_time": datetime.utcnow() + timedelta(hours=3),
            "status": "draft",
            "created_by": admin["_id"],
            "settings": {
                "max_participants": 100,
                "max_submissions": 100,
                "time_limit_per_test": 2,
                "memory_limit": 256
            },
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        result = await db.contests.insert_one(contest)
        problem = {
            "contest_id": result.inserted_id,
            "title": "Reverse Engineering Challenge",
            "description": "Analyze the executable and write an equivalent Python solution",
            "time_limit": 2,
            "memory_limit": 256,
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        await db.problems.insert_one(problem)
        print("Sample contest created")
    else:
        print("Sample contest already exists")
    
    print("Seeding complete!")
    client.close()


if __name__ == "__main__":
    asyncio.run(seed())