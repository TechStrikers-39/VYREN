from fastapi import APIRouter, Depends, HTTPException, status
from gotrue.errors import AuthApiError
from supabase import create_client

from app.core.config import get_settings
from app.core.dependencies import get_current_user
from app.schemas.auth import (
    AuthResponse,
    LoginRequest,
    RegisterRequest,
    UserProfileResponse,
)
from app.repositories.user_repo import UserRepository
from app.utils.supabase_client import get_supabase

settings = get_settings()
router = APIRouter()


def get_anon_supabase():
    """Returns an ephemeral anon Supabase client for user auth operations."""
    return create_client(settings.supabase_url, settings.supabase_anon_key)


@router.post(
    "/register",
    response_model=AuthResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user",
)
async def register(req: RegisterRequest):
    """
    Register a new user using Supabase Auth admin API.
    Auto-confirms email and triggers profile creation in `profiles`.
    SECURITY: Public registration strictly prohibits self-creation of 'admin' accounts.
    """
    admin_client = get_supabase()
    anon_client = get_anon_supabase()

    # Security check: Never permit arbitrary self-creation of admin accounts
    requested_role = (req.role or "learner").strip().lower()
    if requested_role == "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator accounts cannot be self-registered publicly. Admin access must be provisioned by an existing system administrator.",
        )
    if requested_role not in ("learner", "trainer"):
        requested_role = "learner"

    try:
        auth_response = admin_client.auth.admin.create_user(
            {
                "email": req.email,
                "password": req.password,
                "email_confirm": True,
                "user_metadata": {
                    "full_name": req.full_name or "",
                    "role": requested_role,
                },
            }
        )
    except AuthApiError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Registration failed: {e.message}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Registration failed: {str(e)}",
        )


    if not auth_response.user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Registration failed — user object not created.",
        )

    user_id = auth_response.user.id

    # Update profile metadata and role in DB
    update_data = {"role": req.role or "learner"}
    if req.full_name:
        update_data["full_name"] = req.full_name
    if req.organization:
        update_data["organization"] = req.organization
    if req.department:
        update_data["department"] = req.department
    if req.designation:
        update_data["designation"] = req.designation

    admin_client.table("profiles").upsert({"id": user_id, "email": req.email, **update_data}, on_conflict="id").execute()

    # Log in user via anon client to get session token
    try:
        login_res = anon_client.auth.sign_in_with_password(
            {"email": req.email, "password": req.password}
        )
        access_token = login_res.session.access_token if login_res.session else ""
        expires_in = login_res.session.expires_in if login_res.session else None
    except Exception:
        access_token = ""
        expires_in = None

    profile = UserRepository.get_profile(user_id) or {}

    return AuthResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=expires_in,
        user=UserProfileResponse(**profile),
    )


@router.post(
    "/login",
    response_model=AuthResponse,
    summary="Login with email and password",
)
async def login(req: LoginRequest):
    """
    Authenticate user via Supabase Auth and return access token + user profile.
    Uses an ephemeral anon client to avoid polluting backend service role state.
    """
    anon_client = get_anon_supabase()
    admin_client = get_supabase()

    try:
        auth_response = anon_client.auth.sign_in_with_password(
            {"email": req.email, "password": req.password}
        )
    except AuthApiError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: {e.message}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: {str(e)}",
        )

    if not auth_response.session or not auth_response.user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials.",
        )

    user_id = auth_response.user.id

    profile = UserRepository.get_profile(user_id)

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found.",
        )

    return AuthResponse(
        access_token=auth_response.session.access_token,
        token_type="bearer",
        expires_in=auth_response.session.expires_in,
        user=UserProfileResponse(**profile),
    )


@router.post(
    "/logout",
    status_code=status.HTTP_200_OK,
    summary="Logout user",
)
async def logout(current_user: dict = Depends(get_current_user)):
    """
    Logout current user session.
    """
    return {"message": "Successfully logged out."}


@router.get(
    "/me",
    response_model=UserProfileResponse,
    summary="Get current user profile",
)
async def get_me(current_user: dict = Depends(get_current_user)):
    """
    Get profile of the currently authenticated user.
    """
    return UserProfileResponse(**current_user)


@router.get(
    "/google/url",
    summary="Get Supabase Google OAuth authorization URL",
)
async def get_google_auth_url():
    """
    Returns the official Supabase OAuth authorization URL for Google authentication.
    Uses implicit flow so access_token is returned directly in the hash fragment.
    """
    redirect_url = f"{settings.primary_frontend_url}/auth/callback"
    url = f"{settings.supabase_url}/auth/v1/authorize?provider=google&redirect_to={redirect_url}"
    return {"url": url}


