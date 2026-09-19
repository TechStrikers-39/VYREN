import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from app.repositories.competency_repo import CompetencyRepository
from app.repositories.course_repo import CourseRepository
from app.services.gap_engine import GapEngine
from app.services.scoring_engine import ScoringEngine
from app.utils.supabase_client import get_supabase

logger = logging.getLogger(__name__)


class AssessmentRepository:
    DEFAULT_ASSESSMENT_ID = "a1000000-0000-0000-0000-000000000001"

    DEPRECATED_ITEM_IDS = {
        "551a72fc-d340-4779-b420-1c5e74dd09ef",
        "6c50190f-81df-4359-8ff4-ef771a384769",
        "62d3647b-987b-4a47-9f54-69f65610af20",
        "32506f3c-fc9e-4218-a526-66b077b1196a",  # Duplicate of c3d83ced
    }

    @classmethod
    def load_offline_anchors(cls) -> List[dict]:
        """
        Loads the 20 verified baseline anchor items from local static storage.
        Fallback only: used when Supabase is unreachable.
        """
        try:
            data_path = Path(__file__).resolve().parent.parent / "data" / "baseline_anchors.json"
            if data_path.exists():
                with open(data_path, "r", encoding="utf-8") as f:
                    return json.load(f)
        except Exception as e:
            logger.error(f"[AssessmentRepo] Failed loading offline anchors: {e}")
        return []

    @classmethod
    def _legacy_filter_clean_anchors(cls, raw_items: List[dict]) -> List[dict]:
        """
        Isolated compatibility filter used prior to Migration 009 execution.
        Filters out known test artifacts and duplicates from raw assessment_items.
        """
        return [
            it for it in raw_items
            if str(it.get("id")) not in cls.DEPRECATED_ITEM_IDS
            and "automated audit verification" not in (it.get("prompt") or "").lower()
        ]

    @classmethod
    def get_validated_anchors(cls) -> List[dict]:
        """
        Retrieves clean, validated baseline anchor items with graceful compatibility.
        
        Three-tier priority:
        1. Migration 009 metadata: query `quality_status = 'validated'`
        2. Legacy compatibility: query all items and filter via isolated `_legacy_filter_clean_anchors`
        3. Offline verified anchor fallback: load from local JSON if Supabase is unreachable
        """
        # Tier 1: Try authoritative query using Migration 009 quality metadata
        try:
            supabase = get_supabase()
            res = (
                supabase.table("assessment_items")
                .select("*")
                .eq("quality_status", "validated")
                .order("order_index")
                .execute()
            )
            if res.data and len(res.data) >= 18:
                logger.info(f"[AssessmentRepo] Loaded {len(res.data)} anchors via Migration 009 quality metadata.")
                return res.data
        except Exception as meta_err:
            logger.info(f"[AssessmentRepo] Migration 009 quality metadata query skipped ({meta_err}). Proceeding to compatibility filter.")

        # Tier 2: Pre-migration legacy compatibility query
        try:
            supabase = get_supabase()
            res = (
                supabase.table("assessment_items")
                .select("*")
                .order("order_index")
                .execute()
            )
            raw_items = res.data or []
            clean_items = cls._legacy_filter_clean_anchors(raw_items)
            if len(clean_items) >= 18:
                logger.info(f"[AssessmentRepo] Loaded {len(clean_items)} anchors via legacy compatibility filter.")
                return clean_items
        except Exception as db_err:
            logger.warning(f"[AssessmentRepo] Supabase database query failed ({db_err}). Falling back to offline anchors.")

        # Tier 3: Offline static verified anchor fallback
        logger.warning("[AssessmentRepo] Using offline verified anchor fallback.")
        return cls.load_offline_anchors()

    @classmethod
    def _normalize_id(cls, aid: str) -> str:
        if not aid or aid == "asm-001" or len(aid) < 32:
            return cls.DEFAULT_ASSESSMENT_ID
        return aid

    @classmethod
    def get_assessment_detail(cls, assessment_id: str) -> dict | None:
        supabase = get_supabase()
        normalized_id = cls._normalize_id(assessment_id)

        res = (
            supabase.table("assessments")
            .select("*")
            .eq("id", normalized_id)
            .eq("is_active", True)
            .execute()
        )
        if not res.data:
            return None

        assessment = res.data[0]
        if not assessment.get("time_limit_minutes"):
            assessment["time_limit_minutes"] = 15

        # Fetch assessment items (excluding correct_index in returned items)
        items_res = (
            supabase.table("assessment_items")
            .select("id, assessment_id, competency_id, prompt, options, weight, difficulty, order_index")
            .eq("assessment_id", normalized_id)
            .order("order_index")
            .execute()
        )
        raw_items = items_res.data or []

        # Server-side item sequence randomization to prevent memorization / cheating
        import random
        shuffled = list(raw_items)
        random.shuffle(shuffled)
        assessment["items"] = shuffled
        return assessment

    @classmethod
    def get_raw_assessment_items(cls, assessment_id: str) -> List[dict]:
        """Internal helper — fetches full items WITH correct_index for scoring."""
        supabase = get_supabase()
        normalized_id = cls._normalize_id(assessment_id)
        res = (
            supabase.table("assessment_items")
            .select("*")
            .eq("assessment_id", normalized_id)
            .execute()
        )
        return res.data or []

    @classmethod
    def process_and_store_submission(
        cls,
        user_id: str,
        assessment_id: str,
        answers_dict: Dict[str, int],
    ) -> dict:
        supabase = get_supabase()

        # 1. Check if assessment_id is a personalized AssessmentInstance
        from app.repositories.instance_repo import AssessmentInstanceRepository
        instance = AssessmentInstanceRepository.get_instance(assessment_id)

        if instance:
            raw_items = AssessmentInstanceRepository.get_raw_instance_items_for_scoring(assessment_id)
            normalized_id = instance.get("template_assessment_id") or cls.DEFAULT_ASSESSMENT_ID
            assessment_version = "2.0-personalized"
        else:
            normalized_id = cls._normalize_id(assessment_id)
            assessment_res = (
                supabase.table("assessments")
                .select("id, version")
                .eq("id", normalized_id)
                .single()
                .execute()
            )
            if not assessment_res.data:
                raise ValueError(f"Assessment '{assessment_id}' not found.")
            assessment_version = assessment_res.data.get("version", "1.0")
            raw_items = AssessmentRepository.get_raw_assessment_items(assessment_id)

        # 2. Run Deterministic Scoring Engine
        scoring_res = ScoringEngine.evaluate_submission(raw_items, answers_dict)

        overall_score = scoring_res["overall_score"]
        competency_breakdown = scoring_res["competency_breakdown"]
        item_log = scoring_res["item_log"]

        # 3. Update competency_scores table per competency evaluated
        now_iso = datetime.now(timezone.utc).isoformat()
        for comp_id, breakdown in competency_breakdown.items():
            supabase.table("competency_scores").upsert(
                {
                    "user_id": user_id,
                    "competency_id": comp_id,
                    "score": breakdown["score"],
                    "measured_level": breakdown["measured_level"],
                    "confidence": breakdown["confidence"],
                    "last_assessed_at": now_iso,
                    "updated_at": now_iso,
                },
                on_conflict="user_id,competency_id",
            ).execute()

        # 4. Compute Skill Gap Matrix (incorporating learner's designation)
        from app.repositories.user_repo import UserRepository
        profile = UserRepository.get_profile(user_id) or {}
        user_designation = profile.get("designation")

        competencies = CompetencyRepository.list_competencies()
        gap_matrix = GapEngine.compute_all_gaps(competencies, competency_breakdown, designation=user_designation)

        # 5. Update skill_gaps table
        for gap in gap_matrix:
            supabase.table("skill_gaps").upsert(
                {
                    "user_id": user_id,
                    "competency_id": gap["competency_id"],
                    "current_level": gap["current_level"],
                    "required_level": gap["required_level"],
                    "gap_size": gap["gap_size"],
                    "priority": gap["priority"],
                    "updated_at": now_iso,
                },
                on_conflict="user_id,competency_id",
            ).execute()

        # 6. Generate context-aware, explainable recommendations for top gaps (Top 3–5)
        active_gaps = [g for g in gap_matrix if g["priority"] in ("HIGH", "MEDIUM")]
        active_gaps.sort(key=lambda x: (0 if x["priority"] == "HIGH" else 1, -x["gap_size"]))
        top_gaps = active_gaps[:4]

        from app.services.igot_client import IGOTClientService
        for gap in top_gaps:
            comp_id = str(gap["competency_id"])
            comp_name = gap["competency_name"]

            # Match with real iGOT / Sunbird search
            matched_course = None
            try:
                igot_results = IGOTClientService.search_courses(query=comp_name)
                if igot_results:
                    top_igot = igot_results[0]
                    matched_course = CourseRepository.upsert_normalized_course(top_igot)
            except Exception:
                pass

            if not matched_course:
                matched_course = CourseRepository.get_course_for_competency(comp_id)

            course_id = matched_course.get("id") if matched_course else None
            course_title = matched_course.get("title") if matched_course else f"Targeted Course: {comp_name}"

            rec_title = f"Recommended: {course_title}"
            rec_desc = (
                f"Recommended because {comp_name} is currently Level {gap['current_level']} "
                f"while your role requires Level {gap['required_level']} (Priority: {gap['priority']}). "
                f"Curriculum sourced from iGOT Karmayogi Bharat."
            )

            supabase.table("recommendations").upsert(
                {
                    "user_id": user_id,
                    "competency_id": gap["competency_id"],
                    "course_id": course_id,
                    "title": rec_title,
                    "description": rec_desc,
                    "priority": gap["priority"],
                    "type": "course",
                    "is_dismissed": False,
                }
            ).execute()

        # 7. Store Result Record with Full Evidence Vector
        result_payload = {
            "user_id": user_id,
            "assessment_id": normalized_id,
            "assessment_version": assessment_version,
            "overall_score": overall_score,
            "competency_breakdown": competency_breakdown,
            "item_log": item_log,
            "resulting_gaps": gap_matrix,
            "submitted_at": now_iso,
        }

        saved_result = None
        if instance:
            try:
                extended = dict(result_payload, instance_id=instance["id"], generation_mode=instance.get("generation_mode", "ai_personalized"))
                r = supabase.table("assessment_results").insert(extended).execute()
                if r.data:
                    saved_result = r.data[0]
            except Exception:
                pass

        if not saved_result:
            insert_res = (
                supabase.table("assessment_results")
                .insert(result_payload)
                .execute()
            )
            saved_result = insert_res.data[0] if insert_res.data else result_payload

        # Mark instance submitted if applicable
        if instance:
            res_id = saved_result.get("id") or str(uuid.uuid4())
            AssessmentInstanceRepository.mark_instance_submitted(assessment_id, result_id=res_id)

        return saved_result

    @staticmethod
    def get_result(result_id: str, user_id: str) -> dict | None:
        supabase = get_supabase()
        res = (
            supabase.table("assessment_results")
            .select("*")
            .eq("id", result_id)
            .eq("user_id", user_id)
            .limit(1)
            .execute()
        )
        return res.data[0] if res.data else None

    @classmethod
    def get_latest_result_for_assessment(cls, assessment_id: str, user_id: str) -> dict | None:
        supabase = get_supabase()
        normalized_id = cls._normalize_id(assessment_id)
        res = (
            supabase.table("assessment_results")
            .select("*")
            .eq("assessment_id", normalized_id)
            .eq("user_id", user_id)
            .order("submitted_at", desc=True)
            .limit(1)
            .execute()
        )
        return res.data[0] if res.data else None
