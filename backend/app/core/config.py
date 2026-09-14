from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Optional


class Settings(BaseSettings):
    supabase_url: str
    supabase_anon_key: str
    supabase_service_role_key: str
    supabase_jwt_secret: str
    gemini_api_key: Optional[str] = None
    igot_api_url: Optional[str] = None
    igot_auth_token: Optional[str] = None
    igot_client_id: Optional[str] = None
    igot_client_secret: Optional[str] = None
    igot_channel: str = "igot"
    igot_timeout: float = 10.0
    igot_provider_mode: Optional[str] = None
    frontend_url: str = "http://localhost:3000"
    environment: str = "development"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


@lru_cache()
def get_settings() -> Settings:
    return Settings()
