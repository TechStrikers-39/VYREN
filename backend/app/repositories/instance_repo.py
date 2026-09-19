import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from app.utils.supabase_client import get_supabase

logger = logging.getLogger(__name__)

# Resilient fallback memory store in case Supabase migrations 010-011 haven't been run yet
_MEMORY_INSTANCES: Dict[str, dict] = {}
_MEMORY_INSTANCE_ITEMS: Dict[str, List[dict]] = {}


class AssessmentInstanceRepository:
    """
    Repository for managing personalized assessment instances and their ordered items.
    Enforces that correct_index is NEVER returned to learner-facing API calls.
    """

    @classmethod
    def create_instance(
        cls,
        user_id: str,
        blueprint: dict,
        items: List[dict],
        generation_mode: str = "ai_personalized",
        model_name: Optional[str] = None,
        template_id: str = "a1000000-0000-0000-0000-000000000001",
        time_limit_minutes: int = 20,
    ) -> dict:
        instance_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()

        instance_record = {
            "id": instance_id,
            "user_id": user_id,
            "template_assessment_id": template_id,
            "blueprint": blueprint,
            "generation_mode": generation_mode,
            "generation_model": model_name or "gemini-3.8-flash",
            "status": "ready",
            "time_limit_minutes": time_limit_minutes,
            "created_at": now,
            "updated_at": now,
        }

        # Format items for instance storage
        instance_items_records = []
        for idx, it in enumerate(items):
            item_id = str(it.get("id") or uuid.uuid4())
            instance_items_records.append({
                "id": item_id,
                "instance_id": instance_id,
                "source_item_id": it.get("source_item_id"),
                "competency_id": it.get("competency_id"),
                "prompt": it.get("prompt"),
                "options": it.get("options"),
                "correct_index": it.get("correct_index"),
                "weight": float(it.get("weight", 1.0)),
                "difficulty": it.get("difficulty", "MEDIUM"),
                "question_type": it.get("question_type", "APPLIED"),
                "item_source": it.get("item_source", "gemini_generated"),
                "target_proficiency": it.get("target_proficiency"),
                "rationale": it.get("rationale") or it.get("explanation"),
                "validation_result": it.get("validation"),
                "presentation_order": idx + 1,
                "language": it.get("language", "en"),
                "created_at": now,
            })

        # Save to Supabase with memory fallback
        supabase = get_supabase()
        db_persisted = False
        try:
            res = supabase.table("assessment_instances").insert(instance_record).execute()
            if res.data:
                supabase.table("assessment_instance_items").insert(instance_items_records).execute()
                db_persisted = True
        except Exception as e:
            logger.info(f"[InstanceRepo] Supabase DB write deferred or table not in schema cache: {e}. Storing in resilient instance store.")

        # Always maintain in-memory cache for fast lookup and zero-downtime resiliency
        _MEMORY_INSTANCES[instance_id] = instance_record
        _MEMORY_INSTANCE_ITEMS[instance_id] = instance_items_records

        return instance_record

    @classmethod
    def get_active_instance(cls, user_id: str) -> Optional[dict]:
        """Finds any non-expired, ready, or in-progress instance for this user."""
        supabase = get_supabase()
        try:
            res = (
                supabase.table("assessment_instances")
                .select("*")
                .eq("user_id", user_id)
                .in_("status", ["ready", "in_progress"])
                .order("created_at", desc=True)
                .limit(1)
                .execute()
            )
            if res.data and len(res.data) > 0:
                return res.data[0]
        except Exception:
            pass

        # Fallback to in-memory lookup
        active = [
            inst for inst in _MEMORY_INSTANCES.values()
            if inst.get("user_id") == user_id and inst.get("status") in ("ready", "in_progress")
        ]
        if active:
            active.sort(key=lambda x: x.get("created_at", ""), reverse=True)
            return active[0]

        return None

    @classmethod
    def get_instance(cls, instance_id: str) -> Optional[dict]:
        supabase = get_supabase()
        try:
            res = supabase.table("assessment_instances").select("*").eq("id", instance_id).execute()
            if res.data and len(res.data) > 0:
                return res.data[0]
        except Exception:
            pass
        return _MEMORY_INSTANCES.get(instance_id)

    @classmethod
    def get_instance_items_for_learner(cls, instance_id: str) -> List[dict]:
        """
        Retrieves instance items strictly FOR LEARNER PRESENTATION.
        CRITICAL SECURITY RULE: Excludes correct_index.
        """
        raw_items = cls.get_raw_instance_items_for_scoring(instance_id)
        learner_items = []
        for it in raw_items:
            sanitized = {
                "id": it.get("id"),
                "assessment_id": instance_id,
                "competency_id": it.get("competency_id"),
                "prompt": it.get("prompt"),
                "options": it.get("options"),
                "difficulty": it.get("difficulty"),
                "weight": it.get("weight"),
                "order_index": it.get("presentation_order"),
                "item_source": it.get("item_source"),
                "question_type": it.get("question_type"),
            }
            learner_items.append(sanitized)
        return learner_items

    @classmethod
    def get_raw_instance_items_for_scoring(cls, instance_id: str) -> List[dict]:
        """
        Retrieves instance items WITH correct_index strictly for server-side ScoringEngine.
        """
        supabase = get_supabase()
        try:
            res = (
                supabase.table("assessment_instance_items")
                .select("*")
                .eq("instance_id", instance_id)
                .order("presentation_order")
                .execute()
            )
            if res.data and len(res.data) > 0:
                return res.data
        except Exception:
            pass

        mem_items = _MEMORY_INSTANCE_ITEMS.get(instance_id) or []
        mem_items.sort(key=lambda x: x.get("presentation_order", 0))
        return mem_items

    @classmethod
    def mark_instance_submitted(cls, instance_id: str, result_id: str) -> None:
        now = datetime.now(timezone.utc).isoformat()
        supabase = get_supabase()
        try:
            supabase.table("assessment_instances").update({
                "status": "submitted",
                "submitted_at": now,
                "result_id": result_id,
                "updated_at": now,
            }).eq("id", instance_id).execute()
        except Exception:
            pass

        if instance_id in _MEMORY_INSTANCES:
            _MEMORY_INSTANCES[instance_id]["status"] = "submitted"
            _MEMORY_INSTANCES[instance_id]["submitted_at"] = now
            _MEMORY_INSTANCES[instance_id]["result_id"] = result_id
            _MEMORY_INSTANCES[instance_id]["updated_at"] = now
