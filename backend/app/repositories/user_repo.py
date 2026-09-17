import json
from app.utils.supabase_client import get_supabase


class UserRepository:
    @staticmethod
    def get_profile(user_id: str) -> dict | None:
        supabase = get_supabase()
        res = supabase.table("profiles").select("*").eq("id", user_id).single().execute()
        if not res.data:
            return None
        profile = res.data
        # Decode fallback context if present in igot_id
        igot_id = profile.get("igot_id") or ""
        if igot_id.startswith("CTX:"):
            try:
                ctx = json.loads(igot_id[4:])
                profile["onboarding_completed"] = bool(ctx.get("onboarded", True))
                if not profile.get("responsibilities"):
                    profile["responsibilities"] = ctx.get("resp")
                if not profile.get("tools_experience"):
                    profile["tools_experience"] = ctx.get("tools") or []
                if profile.get("self_reported_level") is None:
                    profile["self_reported_level"] = ctx.get("lvl", 0)
                if not profile.get("target_competencies"):
                    profile["target_competencies"] = ctx.get("targets") or []
            except Exception:
                pass
        
        # Ensure onboarding_completed is always a clean boolean
        if "onboarding_completed" not in profile or profile["onboarding_completed"] is None:
            profile["onboarding_completed"] = False

        return profile

    @staticmethod
    def update_profile(user_id: str, data: dict) -> dict:
        supabase = get_supabase()
        # Filter out None values
        update_data = {k: v for k, v in data.items() if v is not None}
        if not update_data:
            return UserRepository.get_profile(user_id) or {}

        res = supabase.table("profiles").update(update_data).eq("id", user_id).execute()
        return res.data[0] if res.data else UserRepository.get_profile(user_id) or {}

    @staticmethod
    def submit_onboarding(user_id: str, data: dict) -> dict:
        supabase = get_supabase()
        direct_update = {}
        if data.get("department"):
            direct_update["department"] = data["department"]
        if data.get("designation"):
            direct_update["designation"] = data["designation"]

        full_payload = {
            **direct_update,
            "responsibilities": data.get("responsibilities"),
            "tools_experience": data.get("tools_experience") or [],
            "self_reported_level": data.get("self_reported_level", 0),
            "target_competencies": data.get("target_competencies") or [],
            "onboarding_completed": True,
        }

        # Attempt to update full columns if schema is migrated
        try:
            res = supabase.table("profiles").update(full_payload).eq("id", user_id).execute()
            if res.data:
                return res.data[0]
        except Exception:
            # Resilient fallback: store contextual answers in igot_id tag
            context_tag = json.dumps({
                "onboarded": True,
                "resp": data.get("responsibilities"),
                "tools": data.get("tools_experience"),
                "lvl": data.get("self_reported_level"),
                "targets": data.get("target_competencies"),
            })
            direct_update["igot_id"] = f"CTX:{context_tag}"
            res = supabase.table("profiles").update(direct_update).eq("id", user_id).execute()
            if res.data:
                profile = res.data[0]
                profile["onboarding_completed"] = True
                profile["responsibilities"] = data.get("responsibilities")
                profile["tools_experience"] = data.get("tools_experience")
                profile["self_reported_level"] = data.get("self_reported_level")
                profile["target_competencies"] = data.get("target_competencies")
                return profile

        return UserRepository.get_profile(user_id) or {}

