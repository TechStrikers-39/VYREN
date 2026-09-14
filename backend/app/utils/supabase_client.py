from supabase import create_client, Client

from app.core.config import get_settings

settings = get_settings()

_client: Client | None = None


def get_supabase() -> Client:
    """
    Returns a singleton Supabase client initialized with the service-role key.
    The service-role key bypasses RLS — this client is BACKEND ONLY.
    Never expose this client or its key to the frontend.
    """
    global _client
    if _client is None:
        _client = create_client(
            settings.supabase_url,
            settings.supabase_service_role_key,
        )
    return _client
