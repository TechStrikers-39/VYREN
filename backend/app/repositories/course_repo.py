from datetime import datetime, timezone
from typing import List, Optional

from app.repositories.competency_repo import CompetencyRepository
from app.services.gap_engine import GapEngine
from app.services.scoring_engine import convert_score_to_level
from app.utils.supabase_client import get_supabase


class CourseRepository:
    DEFAULT_COURSE_ID = "b0100000-0000-0000-0000-000000000001"
    _IGOT_COURSE_METADATA_CACHE: dict = {}

    @classmethod
    def _normalize_id(cls, cid: str) -> str:
        if not cid or cid == "crs-001" or len(cid) < 32:
            return cls.DEFAULT_COURSE_ID
        return cid

    @staticmethod
    def list_courses() -> List[dict]:
        supabase = get_supabase()
        res = (
            supabase.table("courses")
            .select("*")
            .eq("is_active", True)
            .order("title")
            .execute()
        )
        return res.data or []

    @classmethod
    def get_course_detail(cls, course_id: str) -> dict | None:
        supabase = get_supabase()
        normalized_id = cls._normalize_id(course_id)
        res = (
            supabase.table("courses")
            .select("*")
            .eq("id", normalized_id)
            .eq("is_active", True)
            .single()
            .execute()
        )
        if not res.data:
            return None

        course = res.data
        modules_res = (
            supabase.table("course_modules")
            .select("*")
            .eq("course_id", normalized_id)
            .order("order_index")
            .execute()
        )
        course["modules"] = modules_res.data or []

        # Enrich with verified external iGOT metadata if available in cache or course record
        meta = cls._IGOT_COURSE_METADATA_CACHE.get(normalized_id) or {}
        ext_id = course.get("external_id") or meta.get("external_id")
        ext_url = course.get("external_url") or meta.get("external_url")
        # Provider comes from the DB row or cache only — never fabricated from a legacy string.
        # If neither the DB nor the cache supplies a provider, leave it None.
        provider = course.get("provider") or meta.get("provider") or None
        # integration_mode is derived solely from external_url presence.
        integration_mode = meta.get("integration_mode") or (
            "REAL / SUNBIRD" if ext_url else "FALLBACK / LOCAL"
        )
        course["external_id"] = ext_id
        course["external_url"] = ext_url
        course["provider"] = provider
        course["integration_mode"] = integration_mode
        return course

    @classmethod
    def enroll_user(cls, user_id: str, course_id: str) -> dict:
        supabase = get_supabase()
        normalized_id = cls._normalize_id(course_id)

        # Check existing enrollment
        existing = (
            supabase.table("course_enrollments")
            .select("*")
            .eq("user_id", user_id)
            .eq("course_id", normalized_id)
            .execute()
        )
        if existing.data:
            return existing.data[0]

        now_iso = datetime.now(timezone.utc).isoformat()
        res = (
            supabase.table("course_enrollments")
            .insert(
                {
                    "user_id": user_id,
                    "course_id": normalized_id,
                    "progress_percentage": 0.0,
                    "completed_modules": [],
                    "status": "enrolled",
                    "enrolled_at": now_iso,
                }
            )
            .execute()
        )
        return res.data[0] if res.data else {}

    @staticmethod
    def complete_module(user_id: str, course_id: str, module_id: str) -> dict:
        supabase = get_supabase()

        # 1. Fetch course modules to calculate total count
        course = CourseRepository.get_course_detail(course_id)
        if not course:
            raise ValueError(f"Course '{course_id}' not found.")

        modules = course.get("modules", [])
        total_modules = len(modules)
        target_module = next((m for m in modules if str(m["id"]) == str(module_id)), None)
        if not target_module and modules:
            target_module = modules[0]
            module_id = str(target_module["id"])

        if not target_module:
            raise ValueError(f"Module '{module_id}' not found in course '{course_id}'.")

        # 2. Fetch or create enrollment
        enrollment = CourseRepository.enroll_user(user_id, course_id)
        completed_modules = list(enrollment.get("completed_modules") or [])

        if str(module_id) not in completed_modules:
            completed_modules.append(str(module_id))

        progress_percentage = (
            round((len(completed_modules) / total_modules * 100.0), 2)
            if total_modules > 0
            else 100.0
        )
        status_val = "completed" if progress_percentage >= 100.0 else "in_progress"
        now_iso = datetime.now(timezone.utc).isoformat()

        # Update enrollment tracking ONLY (does NOT alter competency_scores or skill_gaps)
        # Governed by: "Learning completion = learning evidence; Competency improvement = assessment evidence"
        update_data = {
            "completed_modules": completed_modules,
            "progress_percentage": progress_percentage,
            "status": status_val,
        }
        if status_val == "completed":
            update_data["completed_at"] = now_iso

        supabase.table("course_enrollments").update(update_data).eq(
            "id", enrollment["id"]
        ).execute()

        recal_comp_id = target_module.get("competency_id")

        return {
            "message": f"Module '{target_module['title']}' recorded as learning activity evidence.",
            "module_id": str(module_id),
            "course_id": str(course_id),
            "progress_percentage": progress_percentage,
            "recalibrated_competency_id": recal_comp_id,
            "recalibrated_score": None,
            "recalibrated_level": None,
            "updated_gap_priority": None,
        }

    @classmethod
    def get_course_for_competency(cls, competency_id: str) -> Optional[dict]:
        supabase = get_supabase()
        try:
            res = (
                supabase.table("courses")
                .select("*")
                .contains("competencies_covered", [competency_id])
                .eq("is_active", True)
                .limit(1)
                .execute()
            )
            if res.data:
                return res.data[0]
        except Exception:
            pass
        all_c = cls.list_courses()
        return all_c[0] if all_c else None

    @classmethod
    def upsert_normalized_course(cls, course_data: dict) -> dict:
        supabase = get_supabase()
        cid = course_data["id"]
        payload = {
            "id": cid,
            "title": course_data["title"],
            "description": course_data.get("description", ""),
            "category": course_data.get("category", "Data Analytics"),
            "level": course_data.get("level", 2),
            "duration_minutes": course_data.get("duration_minutes", 60),
            "competencies_covered": course_data.get("competencies_covered", []),
            "is_active": course_data.get("is_active", True),
            "external_id": course_data.get("external_id"),
            "external_url": course_data.get("external_url"),
            # Provider must come from actual upstream metadata; never fabricated.
            "provider": course_data.get("provider"),
        }

        # Cache external iGOT metadata in memory so get_course_detail can serve it
        cls._IGOT_COURSE_METADATA_CACHE[cid] = {
            "external_id": course_data.get("external_id"),
            "external_url": course_data.get("external_url"),
            # Preserve whatever provider was normalised from Sunbird; None if not supplied.
            "provider": course_data.get("provider"),
            "integration_mode": course_data.get("integration_mode", "REAL / SUNBIRD"),
        }

        res = supabase.table("courses").upsert(payload, on_conflict="id").execute()

        modules = course_data.get("modules", [])
        for m in modules:
            m_payload = {
                "id": m["id"],
                "course_id": cid,
                "competency_id": m.get("competency_id"),
                "title": m["title"],
                "type": m.get("type", "reading"),
                "content": m.get("content", ""),
                "order_index": m.get("order_index", 0),
                "duration_minutes": m.get("duration_minutes", 15),
            }
            supabase.table("course_modules").upsert(m_payload, on_conflict="id").execute()

        return res.data[0] if res.data else payload

    @classmethod
    def get_learning_path(cls, user_id: str) -> dict:
        supabase = get_supabase()
        profile_res = (
            supabase.table("profiles")
            .select("full_name, email")
            .eq("id", user_id)
            .single()
            .execute()
        )
        learner_name = (
            profile_res.data.get("full_name") if profile_res.data else None
        ) or "Learner"

        results_res = (
            supabase.table("assessment_results")
            .select("id, overall_score, submitted_at")
            .eq("user_id", user_id)
            .order("submitted_at", desc=True)
            .limit(1)
            .execute()
        )
        has_assessment = bool(results_res.data)
        latest_res_id = results_res.data[0]["id"] if has_assessment else "asm-001"

        enroll_res = (
            supabase.table("course_enrollments")
            .select("*")
            .eq("user_id", user_id)
            .execute()
        )
        enrollments_by_course = {e["course_id"]: e for e in (enroll_res.data or [])}

        recs_res = (
            supabase.table("recommendations")
            .select("*, competencies(name, category)")
            .eq("user_id", user_id)
            .eq("is_dismissed", False)
            .order("created_at", desc=True)
            .execute()
        )
        recs = recs_res.data or []

        steps = []
        steps.append({
            "id": "step-diagnostic",
            "title": "Initial Competency Diagnostic",
            "category": "Diagnostic Assessment",
            "duration": "15 mins",
            "status": "completed" if has_assessment else "in_progress",
            "description": "Baseline adaptive assessment establishing capability scores across official statistical and technical domains.",
            "link": f"/learner/assessment/result/{latest_res_id}" if has_assessment else "/learner/assessment/asm-001",
            "action_text": "View Result" if has_assessment else "Start Assessment",
            "course_id": None,
            "module_id": None,
            "competency_id": None,
            "competency_name": None,
            "provider": "VYREN Diagnostic Engine",
            "integration_mode": "STANDARD",
        })

        if recs:
            for idx, r in enumerate(recs[:3]):
                comp_info = r.get("competencies") or {}
                comp_name = comp_info.get("name") or "Statistical Analytics"
                cid = r.get("course_id") or cls.DEFAULT_COURSE_ID

                course = cls.get_course_detail(cid)
                course_title = (
                    course.get("title")
                    if course
                    else r.get("title", f"Targeted Course: {comp_name}")
                )
                course_dur = (
                    f"{course.get('duration_minutes', 90)} mins"
                    if course
                    else "90 mins"
                )

                enrollment = enrollments_by_course.get(cid)
                if enrollment:
                    if enrollment.get("status") == "completed":
                        step_status = "completed"
                        action_text = "Review Module"
                    else:
                        step_status = "in_progress"
                        action_text = "Continue Learning"
                else:
                    step_status = "in_progress" if (has_assessment and idx == 0) else "upcoming"
                    action_text = "Start Course"

                # Derive provider and integration_mode from the actual course record.
                # get_course_detail() already resolves these correctly:
                #   - external_url present  → "REAL / SUNBIRD"
                #   - external_url absent   → "FALLBACK / LOCAL"
                # Never hardcode here so that local and live iGOT courses render honestly.
                course_provider = (
                    course.get("provider") if course else None
                ) or "VYREN Curriculum"
                course_integration_mode = (
                    course.get("integration_mode") if course else "FALLBACK / LOCAL"
                )

                steps.append({
                    "id": f"step-course-{idx + 1}",
                    "title": course_title,
                    "category": "Targeted iGOT Learning Module",
                    "duration": course_dur,
                    "status": step_status,
                    "description": r.get("description")
                    or f"Curated curriculum targeting measured skill gap in {comp_name}.",
                    "link": f"/learner/course/{cid}",
                    "action_text": action_text,
                    "course_id": cid,
                    "module_id": None,
                    "competency_id": r.get("competency_id"),
                    "competency_name": comp_name,
                    "provider": course_provider,
                    "integration_mode": course_integration_mode,
                })
        else:
            if not has_assessment:
                steps.append({
                    "id": "step-awaiting-assessment",
                    "title": "Baseline Assessment Required",
                    "category": "Diagnostic Assessment",
                    "duration": "15 mins",
                    "status": "upcoming",
                    "description": "Complete your baseline competency diagnostic to generate a personalized iGOT learning path.",
                    "link": "/learner/assessment/asm-001",
                    "action_text": "Start Assessment",
                    "course_id": None,
                    "module_id": None,
                    "competency_id": None,
                    "competency_name": None,
                    "provider": "VYREN Diagnostic Engine",
                    "integration_mode": "STANDARD",
                })
            else:
                steps.append({
                    "id": "step-requirements-met",
                    "title": "Cadre Competency Requirements Met",
                    "category": "Competency Status",
                    "duration": "N/A",
                    "status": "completed",
                    "description": "All evaluated competencies currently meet or exceed required cadre benchmarks.",
                    "link": "/learner/dashboard",
                    "action_text": "View Dashboard",
                    "course_id": None,
                    "module_id": None,
                    "competency_id": None,
                    "competency_name": None,
                    "provider": "VYREN Competency Engine",
                    "integration_mode": "STANDARD",
                })

        has_completed_course = any(
            e.get("status") == "completed" for e in enrollments_by_course.values()
        )
        steps.append({
            "id": "step-recalibration",
            "title": "Post-Module Capability Recalibration",
            "category": "Recalibration Assessment",
            "duration": "10 mins",
            "status": "in_progress" if has_completed_course else "upcoming",
            "description": "Evaluates capability improvement following course module completion and updates skill gap measurements.",
            "link": "/learner/assessment/asm-001" if has_completed_course else "#",
            "action_text": "Take Recalibration" if has_completed_course else "Locked",
            "course_id": None,
            "module_id": None,
            "competency_id": None,
            "competency_name": None,
            "provider": "VYREN Adaptive Assessment Engine",
            "integration_mode": "STANDARD",
        })

        total = len(steps)
        completed = sum(1 for s in steps if s["status"] == "completed")
        pct = round((completed / total) * 100.0, 1) if total > 0 else 0.0

        return {
            "learner_id": user_id,
            "learner_name": learner_name,
            "completion_percentage": pct,
            "total_steps": total,
            "completed_steps": completed,
            "active_step_id": next(
                (s["id"] for s in steps if s["status"] == "in_progress"), None
            ),
            "steps": steps,
        }

