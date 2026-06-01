from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Repair Shop ERP"
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
    cors_origins: str = "http://localhost:5173,http://localhost:3000"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]
    
    @property
    def get_database_url(self) -> str:
        """Normalize the database URL for asyncpg compatibility."""
        url = self.database_url
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+asyncpg://", 1)
        elif url.startswith("postgresql://"):
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return url


@lru_cache
def get_settings() -> Settings:
    return Settings()
