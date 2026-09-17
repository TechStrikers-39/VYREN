from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.core.security import verify_jwt
from app.utils.supabase_client import get_supabase

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """
    Dependency: verify JWT, fetch full profile from DB, return user dict.
    Raises HTTP 401 if token is invalid or profile not found.
    """
    token = credentials.credentials
    payload = verify_jwt(token)

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload — missing user ID.",
        )

    from app.repositories.user_repo import UserRepository

    profile = UserRepository.get_profile(user_id)

    if not profile:
        # Auto-provision profile for OAuth users
        user_email = payload.get("email") or ""
        user_meta = payload.get("user_metadata") or {}
        full_name = user_meta.get("full_name") or user_meta.get("name") or (user_email.split("@")[0] if user_email else "User")
        role = user_meta.get("role") or "learner"
        supabase = get_supabase()
        try:
            supabase.table("profiles").upsert({
                "id": user_id,
                "email": user_email,
                "full_name": full_name,
                "role": role,
            }, on_conflict="id").execute()
            profile = UserRepository.get_profile(user_id)
            if profile:
                return profile
        except Exception:
            pass

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User profile not found.",
        )

    return profile


def require_role(*roles: str):
    """
    Dependency factory for server-side RBAC.
    Usage: Depends(require_role("admin")) or Depends(require_role("trainer", "admin"))
    Raises HTTP 403 if the current user's role is not in the allowed list.
    """
    async def role_checker(
        current_user: dict = Depends(get_current_user),
    ) -> dict:
        if current_user.get("role") not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role(s): {', '.join(roles)}.",
            )
        return current_user

    return role_checker
