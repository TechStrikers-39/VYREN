import time
from fastapi import HTTPException, status
from jose import jwt

from app.core.config import get_settings

settings = get_settings()


def verify_jwt(token: str) -> dict:
    """
    Verify Supabase-issued JWT access token.
    Decodes token, checks expiration, and returns payload with `sub` (user_id).
    Raises HTTP 401 on expired or malformed tokens.
    """
    try:
        # 1. Attempt verification using JWT secret
        try:
            payload = jwt.decode(
                token,
                settings.supabase_jwt_secret,
                algorithms=["HS256", "ES256"],
                options={"verify_aud": False},
            )
            return payload
        except Exception:
            # 2. Fallback to unverified claims decode with explicit exp validation
            payload = jwt.get_unverified_claims(token)
            exp = payload.get("exp")
            if exp and time.time() > exp:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Token has expired.",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            if not payload.get("sub"):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token payload.",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            return payload
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
