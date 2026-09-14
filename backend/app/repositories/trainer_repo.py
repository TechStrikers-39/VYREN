from app.utils.supabase_client import get_supabase


class TrainerRepository:
    @staticmethod
    def get_cohort_summary() -> dict:
        supabase = get_supabase()

        profiles_res = (
            supabase.table("profiles")
            .select("id", count="exact")
            .eq("role", "learner")
            .execute()
        )
        total_cohort = profiles_res.count or 0

        scores_res = supabase.table("competency_scores").select("score").execute()
        scores = [float(s["score"]) for s in (scores_res.data or [])]
        avg_score = round(sum(scores) / len(scores), 2) if scores else 0.0

        gaps_res = (
            supabase.table("skill_gaps")
            .select("competency_id, priority, competencies(name)")
            .eq("priority", "HIGH")
            .execute()
        )
        high_gaps = gaps_res.data or []
        high_gaps_count = len(high_gaps)

        top_gap_comp = None
        if high_gaps:
            comp_counts = {}
            for g in high_gaps:
                cname = (g.get("competencies") or {}).get("name", "Unknown")
                comp_counts[cname] = comp_counts.get(cname, 0) + 1
            top_gap_comp = max(comp_counts, key=comp_counts.get)

        return {
            "total_cohort_size": total_cohort,
            "avg_score": avg_score,
            "high_priority_gaps_count": high_gaps_count,
            "top_gap_competency": top_gap_comp,
        }

    @staticmethod
    def create_item(item_data: dict) -> dict:
        supabase = get_supabase()
        comp_id = item_data.get("competency_id")
        if not comp_id or comp_id.startswith("c010") or len(comp_id) < 32:
            first_comp = supabase.table("competencies").select("id").limit(1).execute()
            if first_comp.data:
                item_data["competency_id"] = first_comp.data[0]["id"]

        res = supabase.table("assessment_items").insert(item_data).execute()
        return res.data[0] if res.data else item_data

    @staticmethod
    def list_items() -> list[dict]:
        supabase = get_supabase()
        res = (
            supabase.table("assessment_items")
            .select("*, competencies(name, category), assessments(title)")
            .order("created_at", desc=True)
            .execute()
        )
        return res.data or []

    @staticmethod
    def create_assessment(creator_id: str, data: dict) -> dict:
        supabase = get_supabase()
        data["created_by"] = creator_id
        res = supabase.table("assessments").insert(data).execute()
        return res.data[0] if res.data else data

    @staticmethod
    def list_assessments() -> list[dict]:
        supabase = get_supabase()
        res = (
            supabase.table("assessments")
            .select("*")
            .order("created_at", desc=True)
            .execute()
        )
        return res.data or []

    @staticmethod
    def list_learners() -> list[dict]:
        supabase = get_supabase()
        profiles_res = (
            supabase.table("profiles")
            .select("id, email, full_name, designation, department, updated_at")
            .eq("role", "learner")
            .order("full_name")
            .execute()
        )
        profiles = profiles_res.data or []

        scores_res = supabase.table("competency_scores").select("user_id, score").execute()
        user_scores = {}
        for s in (scores_res.data or []):
            uid = s["user_id"]
            if uid not in user_scores:
                user_scores[uid] = []
            user_scores[uid].append(float(s["score"]))

        gaps_res = (
            supabase.table("skill_gaps")
            .select("user_id, priority, competencies(name)")
            .eq("priority", "HIGH")
            .execute()
        )
        user_high_gaps = {}
        user_top_gaps = {}
        for g in (gaps_res.data or []):
            uid = g["user_id"]
            user_high_gaps[uid] = user_high_gaps.get(uid, 0) + 1
            if uid not in user_top_gaps:
                cname = (g.get("competencies") or {}).get("name")
                if cname:
                    user_top_gaps[uid] = cname

        out = []
        for p in profiles:
            uid = p["id"]
            scs = user_scores.get(uid, [])
            c_index = round(sum(scs) / len(scs), 2) if scs else None
            out.append({
                "id": uid,
                "full_name": p.get("full_name") or p.get("email", "").split("@")[0],
                "email": p.get("email"),
                "designation": p.get("designation") or "Officer",
                "department": p.get("department") or "National Accounts Division",
                "competency_index": c_index,
                "active_gaps_count": user_high_gaps.get(uid, 0),
                "top_gap": user_top_gaps.get(uid, "None"),
                "last_active": p.get("updated_at"),
            })

        return out

