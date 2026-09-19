import logging
from typing import Any, Dict, List, Optional
from app.repositories.instance_repo import AssessmentInstanceRepository
from app.services.ai_assistant import AIAssistantService
from app.services.blueprint_selector import BlueprintSelectionEngine
from app.services.targeting_engine import ContextTargetingEngine, FINAL_ASSESSMENT_SIZE
from app.utils.supabase_client import get_supabase

logger = logging.getLogger(__name__)

class AssessmentOrchestrationService:
    """
    Coordinates end-to-end delivery of personalized baseline assessments.
    Enforces the core rule: exactly 18 items per assessment instance.
    Prevents regeneration on page refresh by returning active instances.
    """

    @classmethod
    def get_clean_anchors(cls) -> List[dict]:
        """
        Retrieves clean, validated baseline anchors through the repository abstraction.
        Gracefully prioritizes:
        1. Supabase authoritative query using Migration 009 quality metadata.
        2. Supabase pre-migration compatibility filter.
        3. Local verified offline anchor fallback (baseline_anchors.json).
        """
        from app.repositories.assessment_repo import AssessmentRepository
        return AssessmentRepository.get_validated_anchors()

    @classmethod
    async def get_or_create_personalized_assessment(
        cls,
        user_id: str,
        locale: str = "en",
        force_regenerate: bool = False,
    ) -> Dict[str, Any]:
        """
        Main entry point for learners starting or resuming their baseline assessment.
        Returns the assessment instance with exactly 18 items (correct_index excluded).
        """
        # 1. Check for existing active instance (Zero regeneration on page refresh)
        if not force_regenerate:
            existing_instance = AssessmentInstanceRepository.get_active_instance(user_id)
            if existing_instance:
                instance_id = existing_instance["id"]
                items = AssessmentInstanceRepository.get_instance_items_for_learner(instance_id)
                if len(items) == FINAL_ASSESSMENT_SIZE:
                    logger.info(f"[Orchestrator] Resuming active assessment instance {instance_id} for user {user_id}")
                    return {
                        "id": instance_id,
                        "title": "VYREN Personalized Baseline Skill Assessment",
                        "description": "Scenario-based diagnostic evaluation calibrated to your cadre profile and analytical toolstack.",
                        "version": "2.0-personalized",
                        "time_limit_minutes": existing_instance.get("time_limit_minutes", 20),
                        "generation_mode": existing_instance.get("generation_mode", "ai_personalized"),
                        "status": existing_instance.get("status", "ready"),
                        "total_items": len(items),
                        "items": items,
                        "blueprint": existing_instance.get("blueprint"),
                    }

        # 2. Build deterministic blueprint from learner onboarding context
        blueprint = ContextTargetingEngine.build_blueprint(user_id=user_id, locale=locale)
        bp_dict = blueprint.model_dump()

        # 3. Retrieve clean domain anchor pool
        anchors = cls.get_clean_anchors()

        # 4. Generate candidate questions via Gemini provider
        candidates: List[dict] = []
        gen_mode = "ai_personalized"
        model_used = "gemini-3.8-flash"

        try:
            candidates = await AIAssistantService.generate_baseline_candidates(
                blueprint_dict=bp_dict,
                target_count=blueprint.generated_target_count,  # Target 12
                locale=locale,
            )
            logger.info(f"[Orchestrator] Gemini generated {len(candidates)} valid candidate items for user {user_id}")
        except Exception as gen_err:
            logger.warning(
                f"[Orchestrator] Gemini candidate generation failed or unavailable ({gen_err}). "
                f"Falling back safely to anchor-padded pool."
            )
            gen_mode = "anchor_padded"
            candidates = []

        # 5. Assemble final 18 items using BlueprintSelectionEngine
        final_18_raw = BlueprintSelectionEngine.select_final_18(
            blueprint=blueprint,
            anchor_pool=anchors,
            candidate_pool=candidates,
        )

        assert len(final_18_raw) == FINAL_ASSESSMENT_SIZE, (
            f"Integrity error: Expected {FINAL_ASSESSMENT_SIZE} items, assembled {len(final_18_raw)}"
        )

        # If no generated candidates were used, explicitly label generation_mode
        has_generated = any(it.get("item_source") == "gemini_generated" for it in final_18_raw)
        if not has_generated:
            gen_mode = "anchor_padded"

        # 6. Persist immutable assessment instance
        instance = AssessmentInstanceRepository.create_instance(
            user_id=user_id,
            blueprint=bp_dict,
            items=final_18_raw,
            generation_mode=gen_mode,
            model_name=model_used if gen_mode == "ai_personalized" else "anchor_vault",
            time_limit_minutes=20,
        )

        instance_id = instance["id"]
        learner_items = AssessmentInstanceRepository.get_instance_items_for_learner(instance_id)

        return {
            "id": instance_id,
            "title": "VYREN Personalized Baseline Skill Assessment",
            "description": "Scenario-based diagnostic evaluation calibrated to your cadre profile and analytical toolstack.",
            "version": "2.0-personalized",
            "time_limit_minutes": 20,
            "generation_mode": gen_mode,
            "status": "ready",
            "total_items": len(learner_items),
            "items": learner_items,
            "blueprint": bp_dict,
        }
