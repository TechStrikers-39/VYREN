from typing import List, Dict, Any, Optional
from app.utils.supabase_client import get_supabase

# ============================================================
# VYREN Demonstration Mappings: Role/Post -> Required Competencies
# Note: These are explicitly labeled as VYREN Demonstration Mappings
# for domain exploration within the Ministry of Statistics & PI.
# The system architecture dynamically queries official database
# requirements if configured, while falling back to demonstration mappings.
# ============================================================
DEMO_DESIGNATION_REQUIREMENTS: Dict[str, Dict[str, int]] = {
    "Assistant Director (Data Analytics)": {
        "Statistical Inference": 3,
        "Data Pipeline Design": 3,
        "Machine Learning Ops": 3,
        "Data Governance": 3,
    },
    "Junior Statistical Officer": {
        "Statistical Inference": 3,
        "Data Pipeline Design": 2,
        "Machine Learning Ops": 1,
        "Data Governance": 2,
    },
    "Senior Statistical Officer": {
        "Statistical Inference": 4,
        "Data Pipeline Design": 3,
        "Machine Learning Ops": 2,
        "Data Governance": 3,
    },
    "Data Governance Lead": {
        "Statistical Inference": 2,
        "Data Pipeline Design": 3,
        "Machine Learning Ops": 2,
        "Data Governance": 4,
    },
    "National Training Officer": {
        "Statistical Inference": 3,
        "Data Pipeline Design": 3,
        "Machine Learning Ops": 2,
        "Data Governance": 3,
    },
    "Chief Statistical Officer & Admin": {
        "Statistical Inference": 4,
        "Data Pipeline Design": 4,
        "Machine Learning Ops": 3,
        "Data Governance": 4,
    },
}


class GapEngine:
    @staticmethod
    def resolve_required_level(
        competency_name: str,
        competency_id: str,
        default_level: int,
        designation: Optional[str] = None,
    ) -> tuple[int, str]:
        """
        Resolves required competency level for a learner's designation.
        Returns: (required_level, requirement_source)
        """
        if not designation:
            return default_level, "Default Competency Standard"

        # 1. Attempt database lookup if table exists
        try:
            supabase = get_supabase()
            res = (
                supabase.table("designation_competency_requirements")
                .select("required_level")
                .eq("designation", designation)
                .eq("competency_id", competency_id)
                .execute()
            )
            if res.data and len(res.data) > 0:
                return int(res.data[0]["required_level"]), "Official MoSPI / CBC Specification"
        except Exception:
            pass

        # 2. Check demonstration mappings
        demo_map = DEMO_DESIGNATION_REQUIREMENTS.get(designation)
        if demo_map and competency_name in demo_map:
            return demo_map[competency_name], "VYREN Demonstration Mapping"

        # Match case-insensitively or by substring
        if demo_map:
            for cname, lvl in demo_map.items():
                if cname.lower() in competency_name.lower() or competency_name.lower() in cname.lower():
                    return lvl, "VYREN Demonstration Mapping"

        return default_level, "Default Competency Standard"

    @staticmethod
    def compute_gap(measured_level: int, required_level: int) -> Dict[str, Any]:
        """
        Computes gap size and priority for a single competency.
        
        Priority rules:
          - HIGH   if gap_size >= 2
          - MEDIUM if gap_size == 1
          - LOW    if gap_size == 0
          - NONE   if measured_level >= required_level (gap_size <= 0)
        """
        gap_size = max(0, required_level - measured_level)

        if measured_level >= required_level:
            priority = "NONE"
        elif gap_size >= 2:
            priority = "HIGH"
        elif gap_size == 1:
            priority = "MEDIUM"
        else:
            priority = "LOW"

        return {
            "current_level": measured_level,
            "required_level": required_level,
            "gap_size": gap_size,
            "priority": priority,
        }

    @staticmethod
    def compute_all_gaps(
        competencies: List[dict],
        competency_scores: Dict[str, dict],
        designation: Optional[str] = None,
    ) -> List[dict]:
        """
        Computes gap matrix for all registered competencies, taking into account
        the learner's designation requirements where available.
        """
        gaps = []
        for comp in competencies:
            comp_id = str(comp["id"])
            comp_name = comp.get("name", "")
            default_level = int(comp.get("required_level", 3))

            required_level, source = GapEngine.resolve_required_level(
                competency_name=comp_name,
                competency_id=comp_id,
                default_level=default_level,
                designation=designation,
            )

            score_data = competency_scores.get(comp_id, {})
            measured_level = score_data.get("measured_level", 0)

            gap_result = GapEngine.compute_gap(measured_level, required_level)
            gap_result["competency_id"] = comp_id
            gap_result["competency_name"] = comp_name
            gap_result["competency_category"] = comp.get("category")
            gap_result["requirement_source"] = source
            gaps.append(gap_result)

        return gaps

