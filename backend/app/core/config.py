from functools import lru_cache
import os
from pathlib import Path
from typing import Any

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


# Determine the project root directory (parent of backend/)
PROJECT_ROOT = Path(__file__).parent.parent.parent


def _load_env_secret(name: str, default: str | None = None) -> str | None:
    """Load secret from environment or .env file at project root."""
    value = os.getenv(name)
    if value:
        return value

    env_file = PROJECT_ROOT / ".env"
    if env_file.exists():
        try:
            with open(env_file, encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line.startswith("#") or not line:
                        continue
                    if "=" in line:
                        key, val = line.split("=", 1)
                        if key.strip() == name:
                            return val.strip()
        except Exception:
            pass

    return default


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(PROJECT_ROOT / ".env"),
        extra="ignore",
    )

    app_name: str = "Sunset Country Repairs"
    app_env: str = "production"
    app_debug: bool = False
    app_secret_key: str = "dev-secret-change-in-production-min-32-chars"

    database_url: str = "postgresql+asyncpg://sunset:sunset_dev_password@localhost:5432/sunset_erp"

    jwt_secret_key: str = "dev-jwt-secret-change-in-production-min-32-chars"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 30
    jwt_refresh_token_expire_days: int = 7

    s3_endpoint: str = "http://localhost:9000"
    s3_access_key: str = "minioadmin"
    s3_secret_key: str = "minioadmin"
    s3_bucket: str = "sunset-erp"
    s3_region: str = "us-east-1"
    s3_use_ssl: bool = False

    redis_url: str = "redis://localhost:6379/0"
    cors_origins: str = "http://localhost:5173,http://localhost:3000,https://sunsetcountry.repair,https://www.sunsetcountry.repair,https://repairshop.sunsetcountry.repair"

    api_gateway_secret: str | None = None

    @field_validator("api_gateway_secret", mode="before")
    @classmethod
    def _load_api_gateway_secret(cls, v: Any) -> str | None:
        if v is not None and v != "":
            return v
        return _load_env_secret("API_GATEWAY_SECRET")

    @property
    def get_database_url(self) -> str:
        return self.database_url

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()