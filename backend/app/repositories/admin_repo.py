from app.utils.supabase_client import get_supabase


class AdminRepository:
    @staticmethod
    def list_users() -> dict:
        supabase = get_supabase()

        profiles_res = (
            supabase.table("profiles")
            .select("*")
            .order("created_at", desc=True)
            .execute()
        )
        profiles = profiles_res.data or []

        # Fetch scores to compute competency_index per user
        scores_res = supabase.table("competency_scores").select("user_id, score").execute()
        user_scores = {}
        for s in (scores_res.data or []):
            uid = s["user_id"]
            if uid not in user_scores:
                user_scores[uid] = []
            user_scores[uid].append(float(s["score"]))

        user_list = []
        for p in profiles:
            uid = p["id"]
            scores = user_scores.get(uid, [])
            c_index = round(sum(scores) / len(scores), 2) if scores else None
            p["competency_index"] = c_index
            user_list.append(p)

        return {"users": user_list, "total_count": len(user_list)}

    @staticmethod
    def get_analytics() -> dict:
        supabase = get_supabase()

        learners_res = (
            supabase.table("profiles")
            .select("id", count="exact")
            .eq("role", "learner")
            .execute()
        )
        total_learners = learners_res.count or 0

        scores_res = supabase.table("competency_scores").select("score").execute()
        scores = [float(s["score"]) for s in (scores_res.data or [])]
        avg_index = round(sum(scores) / len(scores), 2) if scores else 0.0

        gaps_res = supabase.table("skill_gaps").select("priority").execute()
        gap_distribution = {"HIGH": 0, "MEDIUM": 0, "LOW": 0, "NONE": 0}
        for g in (gaps_res.data or []):
            p = g.get("priority", "NONE")
            if p in gap_distribution:
                gap_distribution[p] += 1

        ass_res = (
            supabase.table("assessments")
            .select("id", count="exact")
            .eq("is_active", True)
            .execute()
        )
        active_ass = ass_res.count or 0

        courses_res = (
            supabase.table("courses")
            .select("id", count="exact")
            .eq("is_active", True)
            .execute()
        )
        active_courses = courses_res.count or 0

        return {
            "total_learners": total_learners,
            "avg_competency_index": avg_index,
            "gap_distribution": gap_distribution,
            "active_assessments_count": active_ass,
            "active_courses_count": active_courses,
        }

    @staticmethod
    def get_training_effectiveness() -> dict:
        supabase = get_supabase()
        courses_res = supabase.table("courses").select("*").eq("is_active", True).execute()
        courses = courses_res.data or []

        enrollments_res = supabase.table("course_enrollments").select("*").execute()
        enrollments = enrollments_res.data or []

        course_stats = []
        for c in courses:
            cid = c["id"]
            c_enr = [e for e in enrollments if e.get("course_id") == cid]
            completed = [e for e in c_enr if e.get("status") == "completed"]
            avg_prog = (
                round(sum(float(e.get("progress_percentage", 0.0)) for e in c_enr) / len(c_enr), 1)
                if c_enr
                else 0.0
            )
            course_stats.append({
                "course_id": cid,
                "title": c.get("title"),
                "category": c.get("category", "General"),
                "level": f"Level {c.get('level', 1)}",
                "enrolled_count": len(c_enr),
                "completed_count": len(completed),
                "avg_progress": avg_prog,
                "completion_rate": round(len(completed) / len(c_enr) * 100, 1) if c_enr else 0.0,
            })

        return {
            "total_courses": len(courses),
            "total_enrollments": len(enrollments),
            "programs": course_stats,
        }


    @staticmethod
    def export_workforce_matrix_csv() -> str:
        import csv
        import io

        supabase = get_supabase()

        profiles_res = (
            supabase.table("profiles")
            .select("*")
            .order("full_name")
            .execute()
        )
        profiles = profiles_res.data or []

        comp_res = supabase.table("competencies").select("id, name").execute()
        comp_map = {c["id"]: c["name"] for c in (comp_res.data or [])}

        scores_res = supabase.table("competency_scores").select("*").execute()
        user_scores = {}
        for s in (scores_res.data or []):
            uid = s["user_id"]
            if uid not in user_scores:
                user_scores[uid] = {}
            comp_name = comp_map.get(s["competency_id"], s["competency_id"])
            user_scores[uid][comp_name] = {
                "score": s.get("score", 0.0),
                "level": s.get("measured_level", 0),
                "confidence": s.get("confidence", 0.0),
                "last_assessed": s.get("last_assessed_at", ""),
            }

        gaps_res = supabase.table("skill_gaps").select("user_id, priority").execute()
        user_gaps = {}
        for g in (gaps_res.data or []):
            uid = g["user_id"]
            if uid not in user_gaps:
                user_gaps[uid] = 0
            if g.get("priority") in ("HIGH", "CRITICAL", "MEDIUM"):
                user_gaps[uid] += 1

        output = io.StringIO()
        writer = csv.writer(output)

        headers = [
            "Officer/Learner Name",
            "Email",
            "Role",
            "Organization",
            "Department",
            "Designation",
            "Statistical Inference (Score %)",
            "Statistical Inference (Level)",
            "Data Pipeline Design (Score %)",
            "Data Pipeline Design (Level)",
            "Machine Learning Ops (Score %)",
            "Machine Learning Ops (Level)",
            "Data Governance (Score %)",
            "Data Governance (Level)",
            "Overall Competency Index (%)",
            "Active Priority Skill Gaps",
            "Last Assessed Date",
            "Framework Alignment",
        ]
        writer.writerow(headers)

        for p in profiles:
            uid = p["id"]
            scores_by_comp = user_scores.get(uid, {})

            def get_comp_stat(cname):
                return scores_by_comp.get(cname, {"score": 0.0, "level": 0, "last_assessed": ""})

            stat_inf = get_comp_stat("Statistical Inference")
            pipe_des = get_comp_stat("Data Pipeline Design")
            ml_ops = get_comp_stat("Machine Learning Ops")
            data_gov = get_comp_stat("Data Governance")

            all_scores = [v["score"] for v in scores_by_comp.values()]
            avg_score = round(sum(all_scores) / len(all_scores), 1) if all_scores else 0.0

            dates = [v["last_assessed"] for v in scores_by_comp.values() if v.get("last_assessed")]
            latest_date = max(dates) if dates else "Not Assessed"

            writer.writerow([
                p.get("full_name") or "Unnamed",
                p.get("email") or "",
                p.get("role") or "learner",
                p.get("organization") or "MoSPI / National Statistical Office",
                p.get("department") or "Data Analytics Wing",
                p.get("designation") or "Statistical Officer",
                stat_inf["score"],
                f"L{stat_inf['level']}",
                pipe_des["score"],
                f"L{pipe_des['level']}",
                ml_ops["score"],
                f"L{ml_ops['level']}",
                data_gov["score"],
                f"L{data_gov['level']}",
                avg_score,
                user_gaps.get(uid, 0),
                latest_date,
                "MoSPI-Aligned Professional Standard",
            ])

        return output.getvalue()
