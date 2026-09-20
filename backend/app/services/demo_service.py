import asyncio
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List

from fastapi import HTTPException, status
from app.utils.supabase_client import get_supabase
from app.repositories.instance_repo import _MEMORY_INSTANCES, _MEMORY_INSTANCE_ITEMS
from app.services.assessment_orchestrator import _IN_FLIGHT_GENERATIONS, _REGISTRY_LOCK

logger = logging.getLogger(__name__)

DEMO_USER_ID = "7912b349-a54d-4938-bf2e-23b0af8ae5d9"
DEMO_USER_EMAIL = "alex.vance@gmail.com"


class DemoResetService:
    """
    Provides isolated state reset capability exclusively for the designated demo learner.
    Strictly forbids resetting arbitrary users, normal learners, trainers, or administrators.
    """

    DEMO_USER_ID = DEMO_USER_ID
    DEMO_USER_EMAIL = DEMO_USER_EMAIL

    @classmethod
    async def reset_demo_learner(cls, user_id: str, email: str) -> Dict[str, Any]:
        # 1. Strict identity validation: require BOTH designated UUID and email
        normalized_email = (email or "").strip().lower()
        if user_id != cls.DEMO_USER_ID or normalized_email != cls.DEMO_USER_EMAIL:
            logger.warning(
                f"[DemoReset] Unauthorized reset attempt blocked. "
                f"user_id={user_id}, email={normalized_email}"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Demo reset operation is strictly restricted to the designated demonstration account.",
            )

        logger.info(f"[DemoReset] Commencing demo learner state reset for user_id={user_id}")
        supabase = get_supabase()

        # 2. Cancel and purge any in-flight generation task for this demo user
        async with _REGISTRY_LOCK:
            task = _IN_FLIGHT_GENERATIONS.pop(user_id, None)
            if task and not task.done():
                logger.info(f"[DemoReset] Cancelling in-flight generation task for user_id={user_id}")
                task.cancel()
                try:
                    await task
                except (asyncio.CancelledError, Exception):
                    pass

        # 3. Handle database state deletions respecting FK constraints
        try:
            # 3A. Break circular references between assessment_instances and assessment_results
            try:
                supabase.table("assessment_instances").update({"result_id": None}).eq("user_id", user_id).execute()
            except Exception as e:
                logger.debug(f"[DemoReset] Break instances result_id: {e}")

            try:
                supabase.table("assessment_results").update({"instance_id": None}).eq("user_id", user_id).execute()
            except Exception as e:
                logger.debug(f"[DemoReset] Break results instance_id: {e}")

            # 3B. Delete assessment instance items
            inst_query = supabase.table("assessment_instances").select("id").eq("user_id", user_id).execute()
            inst_ids = [r["id"] for r in (inst_query.data or []) if "id" in r]
            if inst_ids:
                supabase.table("assessment_instance_items").delete().in_("instance_id", inst_ids).execute()

            # 3C. Delete assessment instances
            supabase.table("assessment_instances").delete().eq("user_id", user_id).execute()

            # 3D. Delete assessment results
            supabase.table("assessment_results").delete().eq("user_id", user_id).execute()

            # 3E. Delete derived learner state
            supabase.table("recommendations").delete().eq("user_id", user_id).execute()
            supabase.table("course_enrollments").delete().eq("user_id", user_id).execute()
            try:
                supabase.table("learning_paths").delete().eq("user_id", user_id).execute()
            except Exception:
                pass
            supabase.table("skill_gaps").delete().eq("user_id", user_id).execute()
            supabase.table("competency_scores").delete().eq("user_id", user_id).execute()

            # 3F. Reset profile onboarding columns to fresh un-onboarded state
            now_iso = datetime.now(timezone.utc).isoformat()
            reset_payload = {
                "onboarding_completed": False,
                "responsibilities": None,
                "tools_experience": [],
                "self_reported_level": None,
                "target_competencies": [],
                "igot_id": None,
                "updated_at": now_iso,
            }
            supabase.table("profiles").update(reset_payload).eq("id", user_id).execute()

        except Exception as db_err:
            logger.error(f"[DemoReset] Database deletion error: {db_err}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to reset demo learner database state: {str(db_err)}",
            )

        # 4. Clear in-memory assessment caches for the demo user
        removed_instance_ids = [
            iid for iid, inst in list(_MEMORY_INSTANCES.items())
            if inst.get("user_id") == user_id
        ]
        for iid in removed_instance_ids:
            _MEMORY_INSTANCES.pop(iid, None)
            _MEMORY_INSTANCE_ITEMS.pop(iid, None)

        logger.info(
            f"[DemoReset] Demo learner reset completed successfully for user_id={user_id}. "
            f"Purged {len(removed_instance_ids)} cached instances from memory."
        )

        # 5. Return minimal, safe response
        return {
            "status": "reset_successful",
            "onboarding_completed": False,
        }
