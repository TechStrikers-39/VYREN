import logging
import re
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from app.repositories.competency_repo import CompetencyRepository
from app.repositories.user_repo import UserRepository
from app.services.competency_mapper import CompetencyMapperService, VYREN_CORE_COMPETENCIES
from app.services.gap_engine import GapEngine

logger = logging.getLogger(__name__)

FINAL_ASSESSMENT_SIZE = 18
MIN_QUESTIONS_PER_COMPETENCY = 3
MAX_QUESTIONS_PER_COMPETENCY = 9


class DifficultyDistribution(BaseModel):
    EASY: int = 0
    MEDIUM: int = 0
    HARD: int = 0


class CompetencySlot(BaseModel):
    competency_id: str
    competency_name: str
    competency_category: str
    question_count: int
    is_primary: bool
    required_level: int
    requirement_source: str
    target_proficiency_band: str
    difficulty_distribution: DifficultyDistribution
    anchor_count: int = 0
    generated_count: int = 0


class AssessmentBlueprint(BaseModel):
    blueprint_id: str = Field(default_factory=lambda: f"bp-{uuid.uuid4().hex[:12]}")
    blueprint_version: str = "vyren-2026-v2.0"
    user_id: str
    designation: str
    department: str
    experience_band: str
    tools_context: List[str] = Field(default_factory=list)
    scenario_context: str = ""
    locale: str = "en"
    total_questions: int = FINAL_ASSESSMENT_SIZE
    anchor_target_count: int = 6
    generated_target_count: int = 12
    overall_difficulty: DifficultyDistribution
    competency_slots: Dict[str, CompetencySlot] = Field(default_factory=dict)
    generated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class ContextTargetingEngine:
    """
    Deterministic targeting engine:
    Transforms learner onboarding signals into an immutable, mathematically balanced
    AssessmentBlueprint specifying exactly 18 assessment slots.
    
    Governing principle:
    "Context personalizes the diagnostic. Performance determines the measured competency."
    """

    @classmethod
    def sanitize_scenario_context(cls, text: Optional[str]) -> str:
        if not text:
            return "Official national statistical survey administration and analytics"
        # 1. Strip HTML tags
        cleaned = re.sub(r"<[^>]*>", " ", text)
        # 2. Strip backticks and quotes
        cleaned = re.sub(r"[`\"']", "", cleaned)
        # 3. Replace newlines with semicolons
        cleaned = re.sub(r"\s+", " ", cleaned).strip()
        # 4. Limit length
        return cleaned[:250]

    @classmethod
    def resolve_experience_band(cls, self_reported_level: Optional[int]) -> str:
        lvl = self_reported_level if self_reported_level is not None else 0
        bands = {
            0: "novice",
            1: "foundational",
            2: "developing",
            3: "proficient",
            4: "advanced",
        }
        return bands.get(lvl, "developing")

    @classmethod
    def calculate_overall_difficulty(cls, self_reported_level: Optional[int]) -> DifficultyDistribution:
        """
        Controlled difficulty variation for exactly 18 questions.
        Default (Level 2): EASY: 4, MEDIUM: 10, HARD: 4.
        Bounded adjustment based on self_reported_level:
          Level 0: EASY: 6, MEDIUM: 10, HARD: 2
          Level 1: EASY: 5, MEDIUM: 10, HARD: 3
          Level 2: EASY: 4, MEDIUM: 10, HARD: 4
          Level 3: EASY: 3, MEDIUM: 10, HARD: 5
          Level 4: EASY: 2, MEDIUM: 10, HARD: 6
        Strict floors: EASY >= 2, MEDIUM >= 8, HARD >= 2.
        Sum is ALWAYS exactly 18.
        """
        lvl = self_reported_level if self_reported_level is not None else 2
        lvl = max(0, min(4, lvl))

        if lvl == 0:
            return DifficultyDistribution(EASY=6, MEDIUM=10, HARD=2)
        elif lvl == 1:
            return DifficultyDistribution(EASY=5, MEDIUM=10, HARD=3)
        elif lvl == 2:
            return DifficultyDistribution(EASY=4, MEDIUM=10, HARD=4)
        elif lvl == 3:
            return DifficultyDistribution(EASY=3, MEDIUM=10, HARD=5)
        else:  # lvl == 4
            return DifficultyDistribution(EASY=2, MEDIUM=10, HARD=6)

    @classmethod
    def build_blueprint(
        cls,
        user_id: str,
        profile_override: Optional[dict] = None,
        locale: str = "en",
    ) -> AssessmentBlueprint:
        # STEP 1: Profile Load
        profile = profile_override
        if profile is None:
            profile = UserRepository.get_profile(user_id)

        if not profile:
            profile = {
                "id": user_id,
                "department": "National Statistical System",
                "designation": "Statistical Officer",
                "responsibilities": "General statistical administration and data reporting",
                "tools_experience": [],
                "self_reported_level": 2,
                "target_competencies": [],
                "onboarding_completed": True,
            }

        designation = profile.get("designation") or "Junior Statistical Officer"
        department = profile.get("department") or "Ministry of Statistics & PI"
        responsibilities = profile.get("responsibilities") or ""
        tools_experience = profile.get("tools_experience") or []
        self_reported_lvl = profile.get("self_reported_level", 2)
        target_competencies = set(profile.get("target_competencies") or [])

        # STEP 2: Load Core Competencies & Role Requirements
        registered_comps = []
        try:
            registered_comps = CompetencyRepository.list_competencies()
        except Exception:
            pass

        if not registered_comps:
            registered_comps = [
                {
                    "id": c["id"],
                    "name": c["name"],
                    "category": c["category"],
                    "required_level": 3,
                }
                for c in VYREN_CORE_COMPETENCIES
            ]

        # STEP 3: Multi-Signal Competency Scoring
        competency_scores: Dict[str, float] = {}
        required_levels: Dict[str, int] = {}
        requirement_sources: Dict[str, str] = {}

        for comp in registered_comps:
            cid = str(comp["id"])
            cname = comp.get("name", "")
            default_req = int(comp.get("required_level", 3))

            req_lvl, req_src = GapEngine.resolve_required_level(
                competency_name=cname,
                competency_id=cid,
                default_level=default_req,
                designation=designation,
            )
            required_levels[cid] = req_lvl
            requirement_sources[cid] = req_src

            # Signal 1: Target Competency explicit selection (40% weight)
            target_signal = 1.0 if cid in target_competencies else 0.0

            # Signal 2: Role requirement depth (30% weight)
            desig_signal = req_lvl / 4.0

            # Signal 3: Responsibilities keyword alignment (20% weight)
            resp_signal = CompetencyMapperService.score_text_against_competency(
                text=responsibilities,
                competency_id=cid,
            )

            # Signal 4: Toolstack experience alignment (10% weight)
            tool_signal = CompetencyMapperService.score_tools_against_competency(
                tools=tools_experience,
                competency_id=cid,
            )

            raw_score = (
                target_signal * 0.40
                + desig_signal * 0.30
                + resp_signal * 0.20
                + tool_signal * 0.10
            )
            competency_scores[cid] = round(raw_score, 3)

        # STEP 4: Primary vs Secondary Identification
        # Top 1 or 2 competencies that meet multi-signal threshold (raw_score > 0.45)
        sorted_comps = sorted(competency_scores.items(), key=lambda x: x[1], reverse=True)
        primary_cids = set()
        for cid, score in sorted_comps[:2]:
            if score > 0.45:
                primary_cids.add(cid)

        # If none exceed threshold, highest score becomes primary to guide focus
        if not primary_cids and sorted_comps:
            primary_cids.add(sorted_comps[0][0])

        # STEP 5: Question Count Allocation (Strict 18)
        # Base guarantee: 3 questions per competency (12 allocated)
        allocations: Dict[str, int] = {str(c["id"]): MIN_QUESTIONS_PER_COMPETENCY for c in registered_comps}
        remaining_slots = FINAL_ASSESSMENT_SIZE - (len(registered_comps) * MIN_QUESTIONS_PER_COMPETENCY)  # 18 - 12 = 6

        # Calculate bonus weights based on primary status and raw scores
        bonus_weights: Dict[str, float] = {}
        for cid, score in competency_scores.items():
            is_primary = cid in primary_cids
            bonus_weights[cid] = (score + 0.5) if is_primary else 0.1

        total_weight = sum(bonus_weights.values()) or 1.0
        # Distribute remaining 6 slots integer-wise
        bonus_awarded = 0
        fractions = []
        for cid, weight in bonus_weights.items():
            exact = (weight / total_weight) * remaining_slots
            integer_part = int(exact)
            fractional_part = exact - integer_part
            allocations[cid] += integer_part
            bonus_awarded += integer_part
            fractions.append((fractional_part, cid))

        # Distribute any leftover fractions to highest fractional values
        fractions.sort(reverse=True, key=lambda x: x[0])
        leftover = remaining_slots - bonus_awarded
        for i in range(leftover):
            cid = fractions[i % len(fractions)][1]
            allocations[cid] += 1

        # Enforce bounds [3, 9] and sum == 18
        for cid in allocations:
            allocations[cid] = max(MIN_QUESTIONS_PER_COMPETENCY, min(MAX_QUESTIONS_PER_COMPETENCY, allocations[cid]))

        current_sum = sum(allocations.values())
        if current_sum != FINAL_ASSESSMENT_SIZE:
            diff = FINAL_ASSESSMENT_SIZE - current_sum
            # Adjust the top primary competency
            top_cid = sorted_comps[0][0]
            allocations[top_cid] += diff

        # STEP 6: Difficulty Distribution Allocation per Competency
        overall_diff = cls.calculate_overall_difficulty(self_reported_lvl)
        easy_pool = overall_diff.EASY
        med_pool = overall_diff.MEDIUM
        hard_pool = overall_diff.HARD

        # Distribute overall difficulty across slots
        slot_difficulties: Dict[str, DifficultyDistribution] = {}
        slot_cids = list(allocations.keys())

        # Baseline: each competency gets at least 1 MEDIUM
        for cid in slot_cids:
            slot_difficulties[cid] = DifficultyDistribution(EASY=0, MEDIUM=1, HARD=0)
        med_pool -= len(slot_cids)

        # Distribute remaining EASY, HARD, and MEDIUM across slots proportionally
        for cid in slot_cids:
            needed = allocations[cid] - 1  # 1 MEDIUM already placed
            # If primary or required level >= 3, allocate more HARD; else allocate more EASY
            req = required_levels.get(cid, 3)
            
            # HARD allocation
            take_hard = min(hard_pool, 1 if req >= 3 and needed > 0 else 0)
            if take_hard > 0 and needed > 0:
                slot_difficulties[cid].HARD += take_hard
                hard_pool -= take_hard
                needed -= take_hard

            # EASY allocation
            take_easy = min(easy_pool, 1 if req <= 2 and needed > 0 else 0)
            if take_easy > 0 and needed > 0:
                slot_difficulties[cid].EASY += take_easy
                easy_pool -= take_easy
                needed -= take_easy

            # Rest from MEDIUM
            take_med = min(med_pool, needed)
            slot_difficulties[cid].MEDIUM += take_med
            med_pool -= take_med
            needed -= take_med

        # Drain any remainder to maintain exact overall sums
        while easy_pool > 0:
            for cid in slot_cids:
                if easy_pool == 0:
                    break
                slot_difficulties[cid].EASY += 1
                easy_pool -= 1

        while hard_pool > 0:
            for cid in slot_cids:
                if hard_pool == 0:
                    break
                slot_difficulties[cid].HARD += 1
                hard_pool -= 1

        while med_pool > 0:
            for cid in slot_cids:
                if med_pool == 0:
                    break
                slot_difficulties[cid].MEDIUM += 1
                med_pool -= 1

        # Adjust each slot so slot EASY+MEDIUM+HARD == allocations[cid]
        for cid in slot_cids:
            sd = slot_difficulties[cid]
            s_sum = sd.EASY + sd.MEDIUM + sd.HARD
            if s_sum != allocations[cid]:
                sd.MEDIUM += (allocations[cid] - s_sum)

        # STEP 7: Assemble Final Blueprint Slots
        slots: Dict[str, CompetencySlot] = {}
        for comp in registered_comps:
            cid = str(comp["id"])
            cname = comp.get("name", "")
            ccat = comp.get("category", "Data Analytics")
            qcount = allocations[cid]
            is_prim = cid in primary_cids
            req_l = required_levels[cid]
            req_s = requirement_sources[cid]

            # Diagnostic target proficiency band
            min_probe = max(0, req_l - 2)
            max_probe = min(4, req_l + 1)
            prof_band = f"L{min_probe}_through_L{max_probe}"

            # Anchor vs Generated allocation
            # Target ~33% anchors per slot (min 1, max 2), rest generated
            anchor_cnt = min(2, max(1, round(qcount * 0.33)))
            gen_cnt = qcount - anchor_cnt

            slots[cid] = CompetencySlot(
                competency_id=cid,
                competency_name=cname,
                competency_category=ccat,
                question_count=qcount,
                is_primary=is_prim,
                required_level=req_l,
                requirement_source=req_s,
                target_proficiency_band=prof_band,
                difficulty_distribution=slot_difficulties[cid],
                anchor_count=anchor_cnt,
                generated_count=gen_cnt,
            )

        total_anchors = sum(s.anchor_count for s in slots.values())
        total_gen = sum(s.generated_count for s in slots.values())

        return AssessmentBlueprint(
            user_id=user_id,
            designation=designation,
            department=department,
            experience_band=cls.resolve_experience_band(self_reported_lvl),
            tools_context=tools_experience,
            scenario_context=cls.sanitize_scenario_context(responsibilities),
            locale=locale,
            total_questions=FINAL_ASSESSMENT_SIZE,
            anchor_target_count=total_anchors,
            generated_target_count=total_gen,
            overall_difficulty=overall_diff,
            competency_slots=slots,
        )
