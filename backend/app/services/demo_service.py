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
    async def get_demo_status(cls, user_id: str, email: str) -> Dict[str, Any]:
        """
        Check if the authenticated user is the designated demo learner, and if so,
        whether an existing demo session/state is present in the database.
        Strictly restricts demo information to the designated demo learner.
        For non-demo users, returns is_demo=False without leaking state.

        Schema-resilient: derives onboarding_completed from the igot_id CTX tag when
        the profiles.onboarding_completed column is not present (migration 008 not applied).
        """
        normalized_email = (email or "").strip().lower()
        if user_id != cls.DEMO_USER_ID or normalized_email != cls.DEMO_USER_EMAIL:
            return {
                "is_demo": False,
                "has_existing_session": False,
                "onboarding_completed": False,
                "assessment_exists": False,
            }

        import json as _json
        supabase = get_supabase()
        onboarding_completed = False
        try:
            # Select igot_id (always present — migration 001) plus onboarding_completed
            # if the column exists.  get() returns all projected columns; missing ones are
            # simply absent from the dict rather than raising a hard error here.
            profile_res = supabase.table("profiles").select("igot_id, onboarding_completed").eq("id", user_id).execute()
            if profile_res.data and len(profile_res.data) > 0:
                row = profile_res.data[0]
                # Prefer the dedicated column when present
                if row.get("onboarding_completed") is not None:
                    onboarding_completed = bool(row["onboarding_completed"])
                else:
                    # Derive from igot_id CTX tag (same logic as UserRepository.get_profile)
                    igot_id = row.get("igot_id") or ""
                    if igot_id.startswith("CTX:"):
                        try:
                            ctx = _json.loads(igot_id[4:])
                            onboarding_completed = bool(ctx.get("onboarded", False))
                        except Exception:
                            pass
        except Exception as e:
            logger.warning(f"[DemoReset] Error querying demo profile status: {e}")

        assessment_exists = False
        try:
            inst_res = supabase.table("assessment_instances").select("id").eq("user_id", user_id).execute()
            assessment_exists = bool(inst_res.data and len(inst_res.data) > 0)
        except Exception as e:
            logger.warning(f"[DemoReset] Error querying demo assessment instances: {e}")

        scores_exist = False
        if not onboarding_completed and not assessment_exists:
            try:
                score_res = supabase.table("competency_scores").select("id").eq("user_id", user_id).execute()
                scores_exist = bool(score_res.data and len(score_res.data) > 0)
            except Exception as e:
                logger.warning(f"[DemoReset] Error querying demo competency scores: {e}")

        has_existing_session = onboarding_completed or assessment_exists or scores_exist

        return {
            "is_demo": True,
            "has_existing_session": has_existing_session,
            "onboarding_completed": onboarding_completed,
            "assessment_exists": assessment_exists,
        }

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

            # 3F. Reset profile to fresh un-onboarded state.
            # Uses the same resilient two-tier strategy as UserRepository.submit_onboarding():
            #   Tier 1 — attempt full column reset (works when migration 008 is applied).
            #   Tier 2 — fall back to clearing igot_id only (works on base migration 001 schema),
            #            which causes get_profile() to derive onboarding_completed=False
            #            and return empty context fields.
            now_iso = datetime.now(timezone.utc).isoformat()
            full_reset_payload: Dict[str, Any] = {
                "onboarding_completed": False,
                "responsibilities": None,
                "tools_experience": [],
                "self_reported_level": None,
                "target_competencies": [],
                "igot_id": None,
                "updated_at": now_iso,
            }
            try:
                res = supabase.table("profiles").update(full_reset_payload).eq("id", user_id).execute()
                if res.data:
                    logger.info(f"[DemoReset] Full profile column reset successful for user_id={user_id}")
                else:
                    raise ValueError("Empty response from full profile reset")
            except Exception as full_err:
                # Tier 2: base-schema fallback — clear igot_id so the CTX tag is gone,
                # and reset only the columns guaranteed by migration 001.
                # get_profile() will then derive onboarding_completed=False (no CTX tag)
                # and return None/empty for all context fields.
                logger.warning(
                    f"[DemoReset] Full column reset failed ({full_err}); "
                    f"falling back to igot_id clear for user_id={user_id}"
                )
                base_reset_payload: Dict[str, Any] = {
                    "igot_id": None,
                    "updated_at": now_iso,
                }
                supabase.table("profiles").update(base_reset_payload).eq("id", user_id).execute()
                logger.info(
                    f"[DemoReset] Base profile reset (igot_id cleared) completed for user_id={user_id}"
                )

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
