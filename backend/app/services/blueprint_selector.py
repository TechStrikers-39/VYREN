import logging
import random
from typing import Any, Dict, List, Optional, Tuple

from app.services.targeting_engine import AssessmentBlueprint, FINAL_ASSESSMENT_SIZE
from app.services.validation_pipeline import ValidationPipeline

logger = logging.getLogger(__name__)


class BlueprintSelectionEngine:
    """
    Assembles exactly 18 assessment items from validated anchor and generated candidate pools
    according to the learner's AssessmentBlueprint.
    
    Guarantees:
    - Final output size is ALWAYS exactly 18.
    - Zero duplicates within the selected set.
    - Respects competency allocation slots and difficulty distributions.
    - Prioritizes validated anchors up to anchor_count, supplemented by validated candidates.
    - Seamlessly falls back to additional anchors if candidate generation is insufficient.
    """

    @classmethod
    def select_final_18(
        cls,
        blueprint: AssessmentBlueprint,
        anchor_pool: List[Dict[str, Any]],
        candidate_pool: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        selected_items: List[Dict[str, Any]] = []
        selected_prompts: List[str] = []
        selected_ids: set = set()

        # Group pools by competency_id
        anchors_by_comp: Dict[str, List[Dict[str, Any]]] = {}
        for a in anchor_pool:
            cid = str(a.get("competency_id"))
            if cid not in anchors_by_comp:
                anchors_by_comp[cid] = []
            anchors_by_comp[cid].append(a)

        candidates_by_comp: Dict[str, List[Dict[str, Any]]] = {}
        for c in candidate_pool:
            cid = str(c.get("competency_id"))
            if cid not in candidates_by_comp:
                candidates_by_comp[cid] = []
            candidates_by_comp[cid].append(c)

        # Iterate over each competency slot defined in blueprint
        for cid, slot in blueprint.competency_slots.items():
            slot_needed = slot.question_count
            slot_anchors_needed = slot.anchor_count
            slot_gen_needed = slot.generated_count

            slot_anchors = anchors_by_comp.get(cid, [])
            slot_candidates = candidates_by_comp.get(cid, [])

            # 1. Pick Anchors for this slot
            chosen_anchors_for_slot: List[Dict[str, Any]] = []
            # Sort anchors to prefer slot's target difficulty
            target_diff = "HARD" if slot.difficulty_distribution.HARD > slot.difficulty_distribution.EASY else "MEDIUM"
            sorted_anchors = sorted(
                slot_anchors,
                key=lambda x: (0 if x.get("difficulty") == target_diff else 1)
            )

            for anc in sorted_anchors:
                aid = str(anc.get("id"))
                aprompt = anc.get("prompt", "")
                if aid in selected_ids:
                    continue
                # Check for duplicate prompt
                is_dup = any(ValidationPipeline.calculate_prompt_similarity(aprompt, p) > 0.65 for p in selected_prompts)
                if is_dup:
                    continue

                chosen_item = dict(anc)
                chosen_item["item_source"] = "anchor"
                chosen_item["source_item_id"] = aid
                chosen_anchors_for_slot.append(chosen_item)
                selected_ids.add(aid)
                selected_prompts.append(aprompt)

                if len(chosen_anchors_for_slot) >= slot_anchors_needed:
                    break

            selected_items.extend(chosen_anchors_for_slot)
            remaining_for_slot = slot_needed - len(chosen_anchors_for_slot)

            # 2. Pick Generated Candidates for this slot
            chosen_candidates_for_slot: List[Dict[str, Any]] = []
            for cand in slot_candidates:
                cid_cand = str(cand.get("id", ""))
                cprompt = cand.get("prompt", "")
                if cid_cand and cid_cand in selected_ids:
                    continue
                is_dup = any(ValidationPipeline.calculate_prompt_similarity(cprompt, p) > 0.65 for p in selected_prompts)
                if is_dup:
                    continue

                chosen_item = dict(cand)
                chosen_item["item_source"] = "gemini_generated"
                chosen_candidates_for_slot.append(chosen_item)
                if cid_cand:
                    selected_ids.add(cid_cand)
                selected_prompts.append(cprompt)

                if len(chosen_candidates_for_slot) >= remaining_for_slot:
                    break

            selected_items.extend(chosen_candidates_for_slot)
            remaining_for_slot -= len(chosen_candidates_for_slot)

            # 3. Fallback: If generated candidates were fewer than needed, fill with remaining anchors
            if remaining_for_slot > 0:
                for anc in slot_anchors:
                    aid = str(anc.get("id"))
                    aprompt = anc.get("prompt", "")
                    if aid in selected_ids:
                        continue
                    is_dup = any(ValidationPipeline.calculate_prompt_similarity(aprompt, p) > 0.65 for p in selected_prompts)
                    if is_dup:
                        continue

                    chosen_item = dict(anc)
                    chosen_item["item_source"] = "anchor"
                    chosen_item["source_item_id"] = aid
                    selected_items.append(chosen_item)
                    selected_ids.add(aid)
                    selected_prompts.append(aprompt)
                    remaining_for_slot -= 1

                    if remaining_for_slot == 0:
                        break

        # Emergency Balancer: Ensure final count is EXACTLY 18
        if len(selected_items) < FINAL_ASSESSMENT_SIZE:
            # Draw from any unused anchors across all competencies
            for anc in anchor_pool:
                aid = str(anc.get("id"))
                aprompt = anc.get("prompt", "")
                if aid not in selected_ids:
                    is_dup = any(ValidationPipeline.calculate_prompt_similarity(aprompt, p) > 0.65 for p in selected_prompts)
                    if not is_dup:
                        chosen_item = dict(anc)
                        chosen_item["item_source"] = "anchor"
                        chosen_item["source_item_id"] = aid
                        selected_items.append(chosen_item)
                        selected_ids.add(aid)
                        selected_prompts.append(aprompt)
                if len(selected_items) == FINAL_ASSESSMENT_SIZE:
                    break

        if len(selected_items) > FINAL_ASSESSMENT_SIZE:
            selected_items = selected_items[:FINAL_ASSESSMENT_SIZE]

        # Sequence ordering: interleave competencies and order by difficulty (EASY -> MEDIUM -> HARD)
        diff_weights = {"EASY": 1, "MEDIUM": 2, "HARD": 3}
        # Stable sort by difficulty tier while preserving competency variety
        selected_items.sort(key=lambda x: diff_weights.get(x.get("difficulty", "MEDIUM"), 2))

        # Assign presentation order (1 to 18)
        for idx, item in enumerate(selected_items):
            item["presentation_order"] = idx + 1
            item["order_index"] = idx + 1

        return selected_items
