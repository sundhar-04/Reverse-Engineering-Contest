from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import Optional, List
from functools import lru_cache


class Settings(BaseSettings):
    APP_NAME: str = "ReverseCode Arena"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    MONGODB_URL: str = "mongodb://localhost:27017"
    MONGODB_DB_NAME: str = "reversecode_arena"
    REDIS_URL: str = "redis://localhost:6379"
    JWT_SECRET_KEY: str = "your-super-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60 * 24 * 7
    UPLOAD_DIR: str = "./uploads"
    MAX_FILE_SIZE: int = 50 * 1024 * 1024
    ALLOWED_EXECUTABLE_EXTENSIONS: list = [".exe", ".out", ".bin"]
    SANDBOX_URL: str = "http://sandbox:8080"
    DEFAULT_TIME_LIMIT: int = 2
    DEFAULT_MEMORY_LIMIT: int = 256
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:5173"]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors(cls, v):
        if isinstance(v, str):
            return [x.strip() for x in v.split(",") if x.strip()]
        return v

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()