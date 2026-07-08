from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.core.config import get_settings
from bson import ObjectId
from typing import Any, Optional
from pydantic_core import core_schema
from pydantic import GetCoreSchemaHandler


class PyObjectId(ObjectId):
    @classmethod
    def __get_pydantic_core_schema__(
        cls, _source_type: Any, _handler: GetCoreSchemaHandler
    ) -> core_schema.CoreSchema:
        return core_schema.json_or_python_schema(
            json_schema=core_schema.str_schema(),
            python_schema=core_schema.union_schema([
                core_schema.is_instance_schema(ObjectId),
                core_schema.chain_schema([
                    core_schema.str_schema(),
                    core_schema.no_info_plain_validator_function(cls.validate),
                ]),
            ]),
            serialization=core_schema.plain_serializer_function_ser_schema(
                lambda x: str(x)
            ),
        )

    @classmethod
    def validate(cls, value: Any) -> ObjectId:
        if not ObjectId.is_valid(value):
            raise ValueError("Invalid ObjectId")
        return ObjectId(value)

settings = get_settings()

client: AsyncIOMotorClient = None
db: AsyncIOMotorDatabase = None


async def connect_to_mongo():
    global client, db
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB_NAME]
    
    # Create indexes
    await create_indexes()
    
    print("Connected to MongoDB")


async def close_mongo_connection():
    global client
    if client:
        client.close()
    print("Closed MongoDB connection")


def get_database() -> AsyncIOMotorDatabase:
    return db


async def create_indexes():
    """Create database indexes for better query performance"""
    # Participants indexes
    await db.participants.create_index([("contest_id", 1), ("roll_number", 1)], unique=True)
    await db.participants.create_index("contest_id")
    
    # Contests indexes
    await db.contests.create_index("status")
    await db.contests.create_index("start_time")
    await db.contests.create_index("end_time")
    
    # Problems indexes
    await db.problems.create_index("contest_id")
    
    # Test cases indexes
    await db.hidden_testcases.create_index([("problem_id", 1), ("test_order", 1)])
    
    # Submissions indexes
    await db.submissions.create_index([("participant_id", 1), ("contest_id", 1)])
    await db.submissions.create_index([("contest_id", 1), ("verdict", 1)])
    await db.submissions.create_index("submitted_at")
    await db.submissions.create_index([("contest_id", 1), ("problem_id", 1)])
    
    # Leaderboard indexes
    await db.leaderboard.create_index([("contest_id", 1), ("rank", 1)])
    await db.leaderboard.create_index([("contest_id", 1), ("total_score", -1), ("solved_count", -1), ("attempts", 1)])
    
    # Admins indexes
    await db.admins.create_index("username", unique=True)
    
    print("Database indexes created")