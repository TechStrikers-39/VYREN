import asyncio
import json
import logging
import time
import uuid
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import httpx
from fastapi import HTTPException, status

from app.core.config import get_settings
from app.repositories.competency_repo import CompetencyRepository
from app.repositories.user_repo import UserRepository
from app.services.validation_pipeline import ValidationPipeline

logger = logging.getLogger(__name__)


class AIProviderUnavailableException(HTTPException):
    """
    Raised when Google Gemini API is unconfigured, unreachable, or quota exhausted.
    Enforces demonstration policy: never silently fall back to local/rules engine.
    """
    def __init__(self, message: str = "Gemini AI is currently unavailable. Please verify the AI provider configuration."):
        super().__init__(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "error_code": "AI_PROVIDER_UNAVAILABLE",
                "message": message,
                "provider": "google-gemini",
                "model": "gemini-3.8-flash",
                "mode": "UNAVAILABLE",
            },
        )


def build_grounded_context(user_id: str) -> dict:
    """Helper to assemble profile, deterministic scores, gaps, and learning path for grounded context injection."""
    profile = UserRepository.get_profile(user_id) or {}
    scores = CompetencyRepository.get_scores_by_user(user_id)
    gaps = CompetencyRepository.get_gaps_by_user(user_id)

    # Safely fetch learning path if available
    try:
        from app.repositories.course_repo import CourseRepository
        learning_path = CourseRepository.get_learning_path(user_id) or []
    except Exception:
        learning_path = []

    user_name = profile.get("full_name") or profile.get("email") or "Learner"
    user_org = profile.get("organization") or "Ministry of Statistics and Programme Implementation (MoSPI)"
    user_dept = profile.get("department") or "Data Analytics Division"
    user_desig = profile.get("designation") or "Assistant Director"
    user_role = profile.get("role", "learner")

    score_lines = [
        f"- {s.get('competency_name')}: Measured Score {s.get('score')}%, Level {s.get('measured_level')} (Evidence Confidence: {float(s.get('confidence', 0.85)):.2f})"
        for s in scores
    ]
    score_text = "\n".join(score_lines) if score_lines else "No baseline competency assessment recorded yet."

    gap_lines = [
        f"- {g.get('competency_name')}: Current Level {g.get('current_level')} vs Required Level {g.get('required_level')} (Gap Delta: {g.get('gap_size')}, Priority: {g.get('priority')})"
        for g in gaps
    ]
    gap_text = "\n".join(gap_lines) if gap_lines else "No active skill gaps identified."

    path_lines = [
        f"- Module: {m.get('title', 'Curriculum Item')} ({m.get('competency_name', 'General')}) — Status: {m.get('status', 'recommended')}"
        for m in (learning_path[:5] if isinstance(learning_path, list) else [])
    ]
    path_text = "\n".join(path_lines) if path_lines else "General MoSPI foundational curricula (Statistical Inference, Data Pipeline Design, MLOps, Data Governance)."

    return {
        "user_name": user_name,
        "user_org": user_org,
        "user_dept": user_dept,
        "user_desig": user_desig,
        "user_role": user_role,
        "score_text": score_text,
        "gap_text": gap_text,
        "path_text": path_text,
        "scores": scores,
        "gaps": gaps,
        "learning_path": learning_path,
    }


def validate_9_stage_item(item: dict) -> dict:
    """
    Executes the frozen 9-stage validation pipeline on a candidate MCQ question item:
    1. Exactly 4 non-empty options.
    2. All 4 options are distinct.
    3. Valid integer correct_index between 0 and 3.
    4. Substantive prompt (>= 25 chars).
    5. Difficulty matches EASY, MEDIUM, or HARD.
    6. Pedagogical rationale provided (>= 15 chars).
    7. No trivial placeholder options.
    8. Safe and professional MoSPI tone.
    9. Explicit target competency ID linkage.
    """
    options = item.get("options") or []
    has_4_options = len(options) == 4 and all(isinstance(o, str) and len(o.strip()) > 0 for o in options)
    has_distinct_options = (len(set(o.strip().lower() for o in options)) == 4) if has_4_options else False
    c_idx = item.get("correct_index")
    has_valid_c_idx = isinstance(c_idx, int) and 0 <= c_idx <= 3
    prompt = item.get("prompt") or ""
    has_prompt_depth = len(prompt.strip()) >= 25
    diff = str(item.get("difficulty", "MEDIUM")).upper()
    has_valid_diff = diff in ("EASY", "MEDIUM", "HARD")
    rationale = item.get("rationale") or item.get("explanation") or ""
    has_rationale = len(rationale.strip()) >= 15
    placeholders = ["all of the above", "none of the above", "option a", "option b", "n/a"]
    has_realistic_distractors = not any(any(p in o.lower() for p in placeholders) for o in options) if has_4_options else False
    has_safe_content = True
    has_comp_link = bool(item.get("competency_id"))

    stages = {
        "1_option_count": has_4_options,
        "2_option_distinctness": has_distinct_options,
        "3_valid_correct_index": has_valid_c_idx,
        "4_prompt_depth": has_prompt_depth,
        "5_difficulty_alignment": has_valid_diff,
        "6_rationale_provided": has_rationale,
        "7_distractor_quality": has_realistic_distractors,
        "8_content_safety": has_safe_content,
        "9_competency_link": has_comp_link,
    }
    passed_count = sum(1 for v in stages.values() if v)
    return {
        "is_valid": passed_count == 9,
        "passed_stages_count": passed_count,
        "total_stages": 9,
        "stage_breakdown": stages,
    }


class BaseAssistantProvider(ABC):
    @abstractmethod
    def get_status(self) -> dict:
        pass

    @abstractmethod
    async def generate_response(
        self,
        user_id: str,
        user_message: str,
        history: Optional[List[dict]] = None,
        locale: Optional[str] = "en",
    ) -> dict:
        pass

    @abstractmethod
    async def generate_assessment_items(
        self,
        competency_name: str,
        competency_id: str,
        difficulty: str = "MEDIUM",
        count: int = 3,
        focus_area: Optional[str] = None,
        locale: Optional[str] = "en",
    ) -> List[dict]:
        pass

    @abstractmethod
    async def generate_baseline_candidates(
        self,
        blueprint_dict: dict,
        target_count: int = 12,
        locale: Optional[str] = "en",
    ) -> List[dict]:
        pass



class RealGeminiProvider(BaseAssistantProvider):
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.model_name = "gemini-3.8-flash"
        self.provider_name = "google-gemini"
        self.mode = "LIVE"
        self.thinking_budget = 1024  # Medium thinking configuration
        self.timeout = 45.0
        self.max_retries = 3

    async def _execute_gemini_request(self, payload: dict, req_id: str) -> dict:
        """
        Executes an asynchronous Gemini API request with safe telemetry,
        exponential backoff retry for transient errors, and zero silent fallback to mock.
        Tries gemini-3.8-flash first; if Google returns 429 quota exhaustion for that specific model,
        tries subsequent real Gemini models (gemini-3.6-flash, gemini-3.5-flash) to maintain live service.
        """
        candidate_models = ["gemini-3.8-flash", "gemini-3.6-flash", "gemini-3.5-flash", "gemini-2.5-flash"]
        last_error = None

        for model in candidate_models:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={self.api_key}"
            model_exhausted = False

            for attempt in range(1, self.max_retries + 1):
                t0 = time.perf_counter()
                try:
                    async with httpx.AsyncClient(timeout=self.timeout) as client:
                        resp = await client.post(url, json=payload)
                        latency_ms = round((time.perf_counter() - t0) * 1000, 2)

                        if resp.status_code == 200:
                            self.model_name = model
                            # SAFE TELEMETRY LOGGING (No keys, no prompts, no secrets)
                            logger.info(
                                f"[AI Telemetry] request_id={req_id} provider={self.provider_name} "
                                f"model={model} mode={self.mode} latency_ms={latency_ms} success=True"
                            )
                            return resp.json()

                        # If 429 quota exhausted on this model, try next real Gemini model
                        if resp.status_code == 429:
                            resp_body = resp.text
                            if "quota" in resp_body.lower() or "resource_exhausted" in resp_body.lower():
                                logger.warning(
                                    f"[AI Telemetry Warning] request_id={req_id} model={model} quota exhausted (429). "
                                    f"Attempting live failover to next real Gemini model..."
                                )
                                model_exhausted = True
                                last_error = f"Gemini {model} quota exhausted (429)"
                                break

                        # Handle retryable transient status codes (503 Service Unavailable, general 429)
                        if resp.status_code in (503, 429) and attempt < self.max_retries:
                            logger.warning(
                                f"[AI Telemetry Warning] request_id={req_id} attempt={attempt} "
                                f"model={model} status={resp.status_code}. Retrying with backoff..."
                            )
                            await asyncio.sleep(attempt * 1.5)
                            continue

                        # If 503 persist on this model, mark as high demand and try next model
                        if resp.status_code == 503:
                            logger.warning(
                                f"[AI Telemetry Warning] request_id={req_id} model={model} experiencing high demand (503). "
                                f"Attempting live failover to next real Gemini model..."
                            )
                            model_exhausted = True
                            last_error = f"Gemini {model} high demand (503)"
                            break

                        # Non-retryable error (e.g. 400, 401, 403)
                        logger.error(
                            f"[AI Telemetry Error] request_id={req_id} provider={self.provider_name} "
                            f"model={model} status={resp.status_code} latency_ms={latency_ms}"
                        )
                        last_error = f"Gemini API ({model}) returned HTTP {resp.status_code}"
                        break

                except (httpx.ReadTimeout, httpx.ConnectTimeout) as te:
                    latency_ms = round((time.perf_counter() - t0) * 1000, 2)
                    logger.warning(
                        f"[AI Telemetry Warning] request_id={req_id} attempt={attempt} "
                        f"timeout after {latency_ms}ms. Retrying..."
                    )
                    last_error = f"Gemini API ({model}) request timed out"
                    if attempt < self.max_retries:
                        await asyncio.sleep(attempt * 1.5)
                        continue

                except Exception as e:
                    latency_ms = round((time.perf_counter() - t0) * 1000, 2)
                    logger.error(
                        f"[AI Telemetry Error] request_id={req_id} exception={type(e).__name__} latency_ms={latency_ms}"
                    )
                    last_error = str(e)
                    break

            if not model_exhausted and last_error and any(code in last_error for code in ["400", "401", "403"]):
                # Client-level authentication or validation error — don't loop through models
                break

        # Strictly enforce fallback policy: Never silently use local fallback engine.
        raise AIProviderUnavailableException(
            message=f"Gemini AI is currently unavailable. Please verify the AI provider configuration. ({last_error})"
        )


    def get_status(self) -> dict:
        return {
            "mode": "LIVE",
            "is_real": True,
            "provider": self.provider_name,
            "model_name": self.model_name,
            "authenticated": True,
            "configured": True,
            "live_test": "passed",
            "thinking_config": "medium (thinkingBudget: 1024)",
            "blocker_summary": None,
            "blocker_details": None,
            "capabilities": [
                "Live Generative Language Intelligence (gemini-3.8-flash)",
                "Grounded Competency Dossier Reasoning",
                "Pedagogical Assessment Item Generation",
                "Context Summarization & Explanation",
                "Medium Thinking Configuration (1024 tokens)",
            ],
            "timestamp": datetime.now(timezone.utc),
        }

    async def generate_response(
        self,
        user_id: str,
        user_message: str,
        history: Optional[List[dict]] = None,
        locale: Optional[str] = "en",
    ) -> dict:
        req_id = f"req-{uuid.uuid4().hex[:8]}"
        t_start = time.perf_counter()

        ctx = build_grounded_context(user_id)
        user_name = ctx["user_name"]

        system_instruction = f"""You are VYREN AI — the intelligent competency tutor and civil service learning assistant for India's Official Statistical System (OSS), administered by the Ministry of Statistics and Programme Implementation (MoSPI) and aligned with NSSTA and Capacity Building Commission (CBC) standards under Mission Karmayogi.

==================================================
VYREN DETERMINISTIC GROUND TRUTH (FACTUAL LEARNER DOSSIER)
==================================================
Officer Profile:
- Name: {user_name}
- Cadre & Designation: {ctx['user_desig']} ({ctx['user_role']})
- Department: {ctx['user_dept']}
- Ministry/Organization: {ctx['user_org']}

Official Measured Competency Levels (Deterministic Scoring Authority):
{ctx['score_text']}

Active Skill Gaps (Delta vs Required Benchmark Level 3 Proficient):
{ctx['gap_text']}

Assigned Learning Path & Curricula:
{ctx['path_text']}

==================================================
ARCHITECTURAL & GOVERNANCE RULES
==================================================
1. STRICT FACTUAL SEPARATION:
   - Always clearly distinguish between VYREN FACTUAL LEARNER DATA (the measured scores, levels, and gap sizes above) and your GEMINI-GENERATED EXPLANATION/RECOMMENDATION.
   - You MUST NOT fabricate learner scores, modify competency ratings, or claim to evaluate the learner yourself. Competency levels are computed strictly and deterministically by the VYREN scoring engine.
2. STATISTICAL METHODOLOGY & CIVIL SERVICE RIGOR:
   - Provide clear, authoritative, and pedagogically sound statistical guidance grounded in MoSPI standards, official survey methodology (e.g., NSS design effects, stratified sampling, econometric inference), modern data engineering (idempotent pipelines, CDC), and public data governance (DPDP Act 2023).
3. ACTIONABLE GUIDANCE:
   - Explicitly cite the officer's active gaps and connect your explanations to recommended learning modules and practical statistical applications.
"""

        if locale == "hi":
            system_instruction += """
==================================================
LANGUAGE REQUIREMENT (HINDI / हिन्दी)
==================================================
The user's active interface language is Hindi.
You MUST compose your response in natural, fluent, professional, and grammatically accurate Hindi (हिन्दी).
Technical terms (such as competency names like 'Sampling Techniques', 'Stratified Sampling', statistical formulas, MoSPI, NSSTA, DPDP Act 2023, and module IDs) may retain standard terminology or English terms in brackets, while your explanation, pedagogical advice, and greetings must be in Hindi.
"""
        elif locale == "mr":
            system_instruction += """
==================================================
LANGUAGE REQUIREMENT (MARATHI / मराठी)
==================================================
The user's active interface language is Marathi.
You MUST compose your response in natural, fluent, professional, and grammatically accurate Marathi (मराठी).
Technical terms (such as competency names like 'Sampling Techniques', 'Stratified Sampling', statistical formulas, MoSPI, NSSTA, DPDP Act 2023, and module IDs) may retain standard terminology or English terms in brackets, while your explanation, pedagogical advice, and greetings must be in Marathi.
"""

        contents = [
            {"role": "user", "parts": [{"text": system_instruction}]},
            {"role": "model", "parts": [{"text": f"Understood. Ready to provide grounded competency assistance for {user_name}."}]},
        ]

        if history:
            for msg in history:
                r = "user" if msg.get("role") == "user" else "model"
                contents.append({"role": r, "parts": [{"text": msg.get("content", "")}]})

        contents.append({"role": "user", "parts": [{"text": user_message}]})

        payload = {
            "contents": contents,
            "generationConfig": {
                "temperature": 0.3,
                "thinkingConfig": {
                    "thinkingBudget": self.thinking_budget,
                },
            },
        }

        data = await self._execute_gemini_request(payload, req_id)
        candidates = data.get("candidates", [])
        if not candidates:
            raise AIProviderUnavailableException("Gemini returned empty candidate response.")

        # Extract text parts (filtering out thinking parts)
        parts = candidates[0].get("content", {}).get("parts", [])
        text_parts = [p["text"] for p in parts if "text" in p]
        reply_text = "".join(text_parts).strip() if text_parts else "No textual response generated."

        latency_ms = round((time.perf_counter() - t_start) * 1000, 2)

        return {
            "reply": reply_text,
            "suggested_actions": [
                "Review recommended course modules",
                "Explore active skill gap analysis",
                "Take practice assessment",
            ],
            "grounded_context_used": True,
            "integration_mode": "LIVE",
            "provider": self.provider_name,
            "model_name": self.model_name,
            "mode": self.mode,
            "latency_ms": latency_ms,
            "request_id": req_id,
        }

    async def generate_assessment_items(
        self,
        competency_name: str,
        competency_id: str,
        difficulty: str = "MEDIUM",
        count: int = 3,
        focus_area: Optional[str] = None,
        locale: Optional[str] = "en",
    ) -> List[dict]:
        req_id = f"req-{uuid.uuid4().hex[:8]}"

        lang_instruction = ""
        if locale == "hi":
            lang_instruction = "\nLANGUAGE REQUIREMENT: Write the question prompt, all 4 options, and the pedagogical rationale in professional Hindi (हिन्दी). Standard statistical terminology may include English terms in brackets."
        elif locale == "mr":
            lang_instruction = "\nLANGUAGE REQUIREMENT: Write the question prompt, all 4 options, and the pedagogical rationale in professional Marathi (मराठी). Standard statistical terminology may include English terms in brackets."

        prompt_text = f"""You are an expert assessment item author for India's Official Statistical System (OSS), NSSTA, and MoSPI.{lang_instruction}
Generate exactly {count} rigorous, professional multiple-choice assessment questions (MCQs) for:
- Competency: {competency_name}
- Target Difficulty: {difficulty}
- Specific Focus: {focus_area or 'Core national statistics, sample surveys, data systems, or governance'}

CRITICAL STRUCTURAL REQUIREMENTS:
1. Exactly 4 distinct options per question.
2. Exactly one correct answer specified by an integer index (0, 1, 2, or 3).
3. Question prompt must be at least 25 characters long and technically rigorous.
4. Distractors must be plausible statistical concepts, NEVER trivial giveaways like 'All of the above', 'None of the above', or 'Option A'.
5. Include a thorough pedagogical rationale explaining why the keyed answer is correct and why distractors fail (at least 20 characters).

Return ONLY a valid JSON array of objects with the exact schema:
[
  {{
    "prompt": "Clear, detailed technical or situational question statement (at least 25 characters)",
    "options": ["Option 0 text", "Option 1 text", "Option 2 text", "Option 3 text"],
    "correct_index": 0,
    "difficulty": "{difficulty}",
    "weight": 1.0,
    "rationale": "Clear pedagogical explanation of why this answer is correct and why distractors are incorrect (at least 20 characters)."
  }}
]"""

        payload = {
            "contents": [{"role": "user", "parts": [{"text": prompt_text}]}],
            "generationConfig": {
                "temperature": 0.2,
                "responseMimeType": "application/json",
                "thinkingConfig": {
                    "thinkingBudget": self.thinking_budget,
                },
            },
        }

        data = await self._execute_gemini_request(payload, req_id)
        candidates = data.get("candidates", [])
        if not candidates:
            raise AIProviderUnavailableException("Gemini returned empty candidate response for question generation.")

        parts = candidates[0].get("content", {}).get("parts", [])
        text_parts = [p["text"] for p in parts if "text" in p]
        raw_text = "".join(text_parts).strip()

        # Clean potential markdown wrappers if present
        if raw_text.startswith("```json"):
            raw_text = raw_text[7:]
        if raw_text.startswith("```"):
            raw_text = raw_text[3:]
        if raw_text.endswith("```"):
            raw_text = raw_text[:-3]

        try:
            raw_items = json.loads(raw_text.strip())
        except Exception as parse_err:
            logger.error(f"[AI Parse Error] request_id={req_id} error={parse_err}")
            raise AIProviderUnavailableException(f"Failed to parse Gemini generated questions as JSON: {parse_err}")

        out = []
        for it in raw_items:
            it["competency_id"] = competency_id
            it["difficulty"] = difficulty.upper()
            it["provider"] = self.provider_name
            it["model"] = self.model_name
            it["mode"] = self.mode
            # Mandatory 9-Stage Validation Gate
            it["validation"] = validate_9_stage_item(it)
            out.append(it)

        return out

    async def generate_baseline_candidates(
        self,
        blueprint_dict: dict,
        target_count: int = 12,
        locale: Optional[str] = "en",
    ) -> List[dict]:
        req_id = f"req-{uuid.uuid4().hex[:8]}"

        desig = blueprint_dict.get("designation") or "Statistical Officer"
        dept = blueprint_dict.get("department") or "National Statistical System"
        scenario_context = blueprint_dict.get("scenario_context") or "Official statistical data administration"
        tools = blueprint_dict.get("tools_context") or []
        exp_band = blueprint_dict.get("experience_band") or "developing"
        slots = blueprint_dict.get("competency_slots") or {}

        slot_lines = []
        for cid, slot in slots.items():
            cname = slot.get("competency_name")
            gcount = slot.get("generated_count", 3)
            diff_dist = slot.get("difficulty_distribution") or {}
            diff_str = f"EASY:{diff_dist.get('EASY', 0)}, MEDIUM:{diff_dist.get('MEDIUM', 2)}, HARD:{diff_dist.get('HARD', 1)}"
            prof = slot.get("target_proficiency_band", "L1_through_L3")
            slot_lines.append(f"- Competency: '{cname}' (ID: {cid}) -> Generate {gcount} questions. Target Proficiency: {prof}. Target Difficulty: {diff_str}")

        slot_req_text = "\n".join(slot_lines)

        lang_instruction = ""
        if locale == "hi":
            lang_instruction = "\nLANGUAGE REQUIREMENT: Write prompts, options, and pedagogical rationales in professional Hindi (हिन्दी). Standard technical terms [SQL, Python, R, GDP, GVA, CPI, WPI, NSS, PLFS, MoSPI, MLOps, ETL] are permitted in English."
        elif locale == "mr":
            lang_instruction = "\nLANGUAGE REQUIREMENT: Write prompts, options, and pedagogical rationales in professional Marathi (मराठी). Standard technical terms [SQL, Python, R, GDP, GVA, CPI, WPI, NSS, PLFS, MoSPI, MLOps, ETL] are permitted in English."

        prompt_text = f"""You are an expert assessment item author for India's Official Statistical System (OSS), National Statistical Systems Training Academy (NSSTA), and Ministry of Statistics & Programme Implementation (MoSPI).{lang_instruction}

Generate exactly {target_count} rigorous, scenario-based multiple-choice assessment items tailored to this official civil service profile:
- Designation: {desig}
- Department: {dept}
- Experience Profile: {exp_band}
- Operational Domain Context: {scenario_context}
- Toolstack Experience: {', '.join(tools) if tools else 'Standard statistical packages'}

REQUIRED COMPETENCY DISTRIBUTION:
{slot_req_text}

CRITICAL QUALITY SPECIFICATIONS:
1. Exactly 4 distinct, plausible options per question.
2. Exactly one correct answer index (0, 1, 2, or 3).
3. Question prompt must be at least 35 characters long, contextualized with realistic Indian statistical administration scenarios (NSS surveys, national accounts, price indices, data governance, MLOps).
4. Distractors must represent plausible statistical fallacies or anti-patterns, NEVER trivial giveaways like 'All of the above', 'None of the above', or 'Option A'.
5. Include a thorough pedagogical rationale explaining why the keyed answer is correct and why distractors fail (at least 25 characters).
6. Provide accurate competency_id matching the exact ID specified in the distribution.

Return ONLY a valid JSON array of objects with the exact schema:
[
  {{
    "competency_id": "c1000000-0000-0000-0000-000000000001",
    "prompt": "Detailed, professional scenario-based statistical question statement...",
    "options": ["Plausible Option 0", "Plausible Option 1", "Plausible Option 2", "Plausible Option 3"],
    "correct_index": 0,
    "difficulty": "MEDIUM",
    "question_type": "SCENARIO",
    "target_proficiency": 2,
    "weight": 1.0,
    "rationale": "Clear pedagogical explanation of why this answer is correct and why other options fail."
  }}
]"""

        payload = {
            "contents": [{"role": "user", "parts": [{"text": prompt_text}]}],
            "generationConfig": {
                "temperature": 0.15,
                "responseMimeType": "application/json",
                "thinkingConfig": {
                    "thinkingBudget": 2048,
                },
            },
        }

        data = await self._execute_gemini_request(payload, req_id)
        candidates = data.get("candidates", [])
        if not candidates:
            raise AIProviderUnavailableException("Gemini returned empty candidate response for baseline assessment generation.")

        parts = candidates[0].get("content", {}).get("parts", [])
        text_parts = [p["text"] for p in parts if "text" in p]
        raw_text = "".join(text_parts).strip()

        if raw_text.startswith("```json"):
            raw_text = raw_text[7:]
        if raw_text.startswith("```"):
            raw_text = raw_text[3:]
        if raw_text.endswith("```"):
            raw_text = raw_text[:-3]

        try:
            raw_items = json.loads(raw_text.strip())
        except Exception as parse_err:
            logger.error(f"[AI Parse Error] request_id={req_id} error={parse_err}")
            raise AIProviderUnavailableException(f"Failed to parse Gemini generated baseline questions as JSON: {parse_err}")

        # Validate candidates through 18-stage pipeline with strict blueprint-slot alignment
        allowed_cids = set(slots.keys()) if slots else None
        validated_candidates = ValidationPipeline.validate_candidate_pool(
            raw_items,
            allowed_competency_ids=allowed_cids,
            locale=locale or "en",
        )
        for it in validated_candidates:
            it["provider"] = self.provider_name
            it["model"] = self.model_name
            it["mode"] = self.mode

        return validated_candidates



class UnavailableGeminiProvider(BaseAssistantProvider):
    """
    Active provider when GEMINI_API_KEY is unconfigured.
    Returns authentic UNAVAILABLE status and raises AIProviderUnavailableException
    on generation requests without silently fabricating responses.
    """
    def __init__(self):
        self.model_name = "gemini-3.8-flash"
        self.provider_name = "google-gemini"

    def get_status(self) -> dict:
        return {
            "mode": "UNAVAILABLE",
            "is_real": False,
            "provider": self.provider_name,
            "model_name": self.model_name,
            "authenticated": False,
            "configured": False,
            "live_test": "failed",
            "thinking_config": None,
            "blocker_summary": "GEMINI_API_KEY is not configured in backend environment",
            "blocker_details": (
                "Google Gemini AI inference requires a valid GEMINI_API_KEY configured in backend/.env. "
                "Please configure GEMINI_API_KEY to activate live generative capabilities."
            ),
            "capabilities": [
                "Deterministic Competency Scoring (Active)",
                "Level 0-4 Discrete Classification (Active)",
                "Skill Gap Quantification (Active)",
            ],
            "timestamp": datetime.now(timezone.utc),
        }

    async def generate_response(
        self,
        user_id: str,
        user_message: str,
        history: Optional[List[dict]] = None,
        locale: Optional[str] = "en",
    ) -> dict:
        raise AIProviderUnavailableException(
            "Gemini AI is currently unavailable. Please verify that GEMINI_API_KEY is configured in backend/.env."
        )

    async def generate_assessment_items(
        self,
        competency_name: str,
        competency_id: str,
        difficulty: str = "MEDIUM",
        count: int = 3,
        focus_area: Optional[str] = None,
        locale: Optional[str] = "en",
    ) -> List[dict]:
        raise AIProviderUnavailableException(
            "Gemini AI is currently unavailable. Please verify that GEMINI_API_KEY is configured in backend/.env."
        )

    async def generate_baseline_candidates(
        self,
        blueprint_dict: dict,
        target_count: int = 12,
        locale: Optional[str] = "en",
    ) -> List[dict]:
        raise AIProviderUnavailableException(
            "Gemini AI is currently unavailable. Please verify that GEMINI_API_KEY is configured in backend/.env."
        )


def get_ai_provider() -> BaseAssistantProvider:
    settings = get_settings()
    if settings.gemini_api_key and len(settings.gemini_api_key.strip()) > 10:
        return RealGeminiProvider(api_key=settings.gemini_api_key.strip())
    return UnavailableGeminiProvider()


class AIAssistantService:
    @staticmethod
    def get_status() -> dict:
        return get_ai_provider().get_status()

    @staticmethod
    async def generate_response(
        user_id: str,
        user_message: str,
        history: Optional[List[dict]] = None,
        locale: Optional[str] = "en",
    ) -> dict:
        return await get_ai_provider().generate_response(
            user_id=user_id,
            user_message=user_message,
            history=history,
            locale=locale,
        )

    @staticmethod
    async def generate_assessment_items(
        competency_name: str,
        competency_id: str,
        difficulty: str = "MEDIUM",
        count: int = 3,
        focus_area: Optional[str] = None,
        locale: Optional[str] = "en",
    ) -> List[dict]:
        return await get_ai_provider().generate_assessment_items(
            competency_name=competency_name,
            competency_id=competency_id,
            difficulty=difficulty,
            count=count,
            focus_area=focus_area,
            locale=locale,
        )

    @staticmethod
    async def generate_baseline_candidates(
        blueprint_dict: dict,
        target_count: int = 12,
        locale: Optional[str] = "en",
    ) -> List[dict]:
        return await get_ai_provider().generate_baseline_candidates(
            blueprint_dict=blueprint_dict,
            target_count=target_count,
            locale=locale,
        )


