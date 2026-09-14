from app.utils.supabase_client import get_supabase


class CompetencyRepository:
    @staticmethod
    def list_competencies() -> list[dict]:
        supabase = get_supabase()
        res = (
            supabase.table("competencies")
            .select("*")
            .order("category")
            .order("name")
            .execute()
        )
        return res.data or []

    @staticmethod
    def get_scores_by_user(user_id: str) -> list[dict]:
        supabase = get_supabase()
        res = (
            supabase.table("competency_scores")
            .select("*, competencies(name, category)")
            .eq("user_id", user_id)
            .execute()
        )
        scores = []
        for r in (res.data or []):
            comp_info = r.pop("competencies", {}) or {}
            r["competency_name"] = comp_info.get("name")
            r["competency_category"] = comp_info.get("category")
            scores.append(r)
        return scores

    @staticmethod
    def get_gaps_by_user(user_id: str) -> list[dict]:
        supabase = get_supabase()
        res = (
            supabase.table("skill_gaps")
            .select("*, competencies(name, category)")
            .eq("user_id", user_id)
            .execute()
        )
        gaps = []
        for r in (res.data or []):
            comp_info = r.pop("competencies", {}) or {}
            r["competency_name"] = comp_info.get("name")
            r["competency_category"] = comp_info.get("category")
            gaps.append(r)
        return gaps

    @staticmethod
    def get_recommendations_by_user(user_id: str) -> list[dict]:
        supabase = get_supabase()
        res = (
            supabase.table("recommendations")
            .select("*")
            .eq("user_id", user_id)
            .eq("is_dismissed", False)
            .order("created_at", desc=True)
            .execute()
        )
        return res.data or []
