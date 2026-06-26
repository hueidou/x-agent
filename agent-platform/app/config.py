import os

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = os.getenv(
        "DATABASE_URL",
        "sqlite+aiosqlite:///./agent_platform.db",
    )
    litellm_proxy_url: str = "http://localhost:4000"

    model_config = {"env_file": ".env"}


settings = Settings()
