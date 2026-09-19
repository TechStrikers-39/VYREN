import difflib
import logging
import re
from typing import Any, Dict, List, Optional, Set, Tuple

logger = logging.getLogger(__name__)

VALID_COMPETENCY_IDS: Set[str] = {
    "c1000000-0000-0000-0000-000000000001",
    "c1000000-0000-0000-0000-000000000002",
    "c1000000-0000-0000-0000-000000000003",
    "c1000000-0000-0000-0000-000000000004",
}

TECHNICAL_WHITELIST_TOKENS: Set[str] = {
    "sql", "python", "r", "stata", "spss", "excel", "api", "etl", "elt",
    "kafka", "spark", "docker", "mlflow", "onnx", "ml", "ai", "gdp", "gva",
    "cpi", "wpi", "nss", "nssta", "mospi", "plfs", "sdc", "dpdp", "greg",
    "ols", "pca", "fifo", "csv", "json", "bi-temporal"
}

STOP_WORDS: Set[str] = {
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and",
    "any", "are", "aren't", "as", "at", "be", "because", "been", "before", "being",
    "below", "between", "both", "but", "by", "can", "can't", "cannot", "could",
    "couldn't", "did", "didn't", "do", "does", "doesn't", "doing", "don't", "down",
    "during", "each", "few", "for", "from", "further", "had", "hadn't", "has",
    "hasn't", "have", "haven't", "having", "he", "her", "here", "hers", "herself",
    "him", "himself", "his", "how", "i", "if", "in", "into", "is", "isn't", "it",
    "it's", "its", "itself", "let's", "me", "more", "most", "mustn't", "my",
    "myself", "no", "nor", "not", "of", "off", "on", "once", "only", "or", "other",
    "ought", "our", "ours", "ourselves", "out", "over", "own", "same", "shan't",
    "she", "should", "shouldn't", "so", "some", "such", "than", "that", "the",
    "their", "theirs", "them", "themselves", "then", "there", "these", "they",
    "this", "those", "through", "to", "too", "under", "until", "up", "very", "was",
    "wasn't", "we", "were", "weren't", "what", "when", "where", "which", "while",
    "who", "whom", "why", "with", "won't", "would", "wouldn't", "you", "your",
    "yours", "yourself", "yourselves", "using", "uses", "used"
}


INDIC_STOP_WORDS: Set[str] = {
    "में", "का", "के", "की", "है", "हैं", "से", "को", "पर", "द्वारा", "और", "या", "नहीं", "होता", "होते", "होती"
}


class ValidationPipeline:
    """
    18-stage structural and deterministic validation pipeline for assessment items.
    Distinguishes hard-rejection stages (item discarded) from soft-rejection stages
    (item flagged/corrected).
    
    Includes:
    - Stage 10: Strict Blueprint-Slot Alignment Validation (Repair 1)
    - Stage 17: Deterministic Answer-Key Consistency Validation (Repair 4)
    """

    @classmethod
    def contains_devanagari(cls, text: str) -> bool:
        """Checks if text contains Devanagari script characters (U+0900 to U+097F)."""
        return bool(re.search(r"[\u0900-\u097f]", text))

    @classmethod
    def calculate_prompt_similarity(cls, prompt_a: str, prompt_b: str) -> float:
        """Calculates normalized sequence similarity between two prompts (0.0 to 1.0)."""
        clean_a = re.sub(r"[^\w\s]", "", prompt_a.lower()).strip()
        clean_b = re.sub(r"[^\w\s]", "", prompt_b.lower()).strip()
        if not clean_a or not clean_b:
            return 0.0
        matcher = difflib.SequenceMatcher(None, clean_a, clean_b)
        return matcher.ratio()

    @classmethod
    def validate_answer_key_consistency(
        cls,
        options: List[str],
        correct_index: int,
        rationale: str,
        prompt: Optional[str] = None,
    ) -> Tuple[bool, str]:
        """
        Stage 17: Deterministic answer-key consistency validation.
        Requirements:
        1. Extract meaningful terms from the keyed correct option.
        2. Normalize: lowercase, strip punctuation and whitespace.
        3. Ignore stop words.
        4. Compare meaningful option terms against rationale.
        5. Require substantive alignment.
        6. Reject candidates where the rationale clearly contradicts the keyed answer.
        7. Simple character length is NEVER a sufficient pass condition.
        """
        if not options or not isinstance(correct_index, int) or not (0 <= correct_index < len(options)):
            return False, "invalid_options_or_index"
        if not rationale or not rationale.strip():
            return False, "missing_rationale"

        correct_opt = options[correct_index].strip()
        correct_lower = correct_opt.lower()
        rationale_lower = rationale.strip().lower()

        # 1. Normalize and extract meaningful terms from correct option (supports Unicode / Devanagari)
        tokens = re.findall(r"\b[\w\-\.\%\$\@]{2,}\b", correct_lower)
        meaningful_terms = [
            t for t in tokens
            if (t not in STOP_WORDS and t not in INDIC_STOP_WORDS) or t in TECHNICAL_WHITELIST_TOKENS
        ]

        if not meaningful_terms and tokens:
            meaningful_terms = tokens

        if not meaningful_terms:
            return False, "no_meaningful_terms_in_option"

        # 2. Contradiction Detection:
        # Check if rationale explicitly claims another option letter or index is the correct answer
        option_letters = ["a", "b", "c", "d"]
        other_indices = [i for i in range(len(options)) if i != correct_index]

        for oi in other_indices:
            ol = option_letters[oi] if oi < 4 else str(oi)
            contradiction_patterns = [
                rf"\boption\s+{ol}\b[^\.\,\;]*?\b(is correct|is the correct|is right|is the right answer)\b",
                rf"\bchoice\s+{ol}\b[^\.\,\;]*?\b(is correct|is right|is the right answer)\b",
                rf"\boption\s+{oi}\b[^\.\,\;]*?\b(is correct|is the correct|is right)\b",
            ]
            for pat in contradiction_patterns:
                if re.search(pat, rationale_lower):
                    return False, f"contradiction_asserts_option_{ol}_correct"

        # Check if rationale explicitly negates a primary term from the keyed option
        for term in meaningful_terms:
            if len(term) >= 3:
                negation_pattern = rf"\b{re.escape(term)}\s+(is incorrect|is wrong|is false|cannot be used|is invalid|fails to work)\b"
                if re.search(negation_pattern, rationale_lower):
                    return False, f"contradiction_negates_term_{term}"

        # 3. Substantive Alignment Check:
        # Meaningful terms from the correct option must match whole words (or simple plurals) in the rationale
        matched_terms = [
            term for term in meaningful_terms
            if re.search(rf"\b{re.escape(term)}s?\b", rationale_lower)
        ]

        if not matched_terms:
            return False, "no_substantive_alignment"

        return True, f"aligned_on_{len(matched_terms)}_terms"

    @classmethod
    def validate_item(
        cls,
        item: Dict[str, Any],
        expected_competency_id: Optional[str] = None,
        existing_prompts: Optional[List[str]] = None,
        locale: str = "en",
    ) -> Dict[str, Any]:
        """
        Executes all 18 stages on an assessment item.
        Returns a detailed result dict with passed_stages, failed_stages, is_valid (hard checks),
        and needs_review (soft checks).
        """
        options = item.get("options") or []
        prompt = (item.get("prompt") or "").strip()
        correct_index = item.get("correct_index")
        difficulty = str(item.get("difficulty") or "MEDIUM").upper()
        rationale = (item.get("rationale") or item.get("explanation") or "").strip()
        comp_id = str(item.get("competency_id") or "")
        q_type = str(item.get("question_type") or "APPLIED").upper()
        target_prof = item.get("target_proficiency")

        # STAGE 1: Option Count (Hard)
        s1_pass = len(options) == 4 and all(isinstance(o, str) and len(o.strip()) > 0 for o in options)

        # STAGE 2: Option Distinctness (Hard)
        s2_pass = len(set(o.strip().lower() for o in options)) == 4 if s1_pass else False

        # STAGE 3: Valid Integer correct_index (Hard)
        s3_pass = isinstance(correct_index, int) and 0 <= correct_index <= 3

        # STAGE 4: Prompt Completeness & Depth (Hard)
        s4_pass = len(prompt) >= 25

        # STAGE 5: Difficulty Validity (Soft: defaults to MEDIUM)
        s5_pass = difficulty in ("EASY", "MEDIUM", "HARD")

        # STAGE 6: Rationale Completeness (Soft)
        s6_pass = len(rationale) >= 20

        # STAGE 7: Distractor Quality (Hard: no trivial giveaways)
        placeholders = [
            "all of the above", "none of the above", "both a and b", "both a & b",
            "option a", "option b", "option c", "option d", "n/a", "cannot be determined"
        ]
        s7_pass = True
        if s1_pass:
            for opt in options:
                opt_lower = opt.lower()
                if any(p in opt_lower for p in placeholders):
                    s7_pass = False
                    break

        # STAGE 8: Content Safety & Tone (Hard)
        unsafe_patterns = [r"\bhack\b", r"\bpassword\b", r"\bexploit\b", r"\bpolitical\b"]
        s8_pass = not any(re.search(pat, prompt.lower()) for pat in unsafe_patterns)

        # STAGE 9: Competency ID Link (Hard: must be authoritative framework ID)
        s9_pass = comp_id in VALID_COMPETENCY_IDS

        # STAGE 10: Blueprint Slot Alignment (Hard: must match requested blueprint slot)
        s10_pass = True
        if expected_competency_id:
            s10_pass = (comp_id == expected_competency_id)

        # STAGE 11: Duplicate / Near-Duplicate Detection (Hard)
        s11_pass = True
        if existing_prompts and prompt:
            for ep in existing_prompts:
                if cls.calculate_prompt_similarity(prompt, ep) > 0.65:
                    s11_pass = False
                    break

        # STAGE 12: Test Artifact Detection (Hard)
        artifact_keywords = [
            "automated audit verification", "test item", "placeholder question",
            "mock prompt", "unit test fixture"
        ]
        s12_pass = not any(kw in prompt.lower() for kw in artifact_keywords)

        # STAGE 13: Question Type Validity (Soft)
        s13_pass = q_type in ("CONCEPTUAL", "APPLIED", "SCENARIO")

        # STAGE 14: Target Proficiency Alignment (Soft)
        s14_pass = target_prof is not None and (0 <= target_prof <= 4) if target_prof is not None else True

        # STAGE 15: Scenario Context Relevance (Soft)
        s15_pass = True
        if q_type == "SCENARIO":
            s15_pass = len(prompt) >= 40 and any(
                w in prompt.lower() for w in [
                    "survey", "data", "system", "production", "division", "pipeline",
                    "office", "sample", "model", "minister", "officer", "scheme"
                ]
            )

        # STAGE 16: Keyed Answer Plausibility (Soft)
        # Verify correct answer option length is not an obvious outlier compared to distractors
        s16_pass = True
        if s1_pass and s3_pass:
            corr_len = len(options[correct_index])
            other_lens = [len(options[i]) for i in range(4) if i != correct_index]
            avg_other = sum(other_lens) / max(1, len(other_lens))
            # Flag if correct answer is less than 20% or more than 400% of average distractor length
            if avg_other > 0 and (corr_len < 0.20 * avg_other or corr_len > 4.0 * avg_other):
                s16_pass = False

        # STAGE 17: Deterministic Answer-Key Consistency Validation (Hard)
        s17_pass = False
        s17_reason = "unverified"
        if s1_pass and s3_pass and rationale:
            s17_pass, s17_reason = cls.validate_answer_key_consistency(
                options=options,
                correct_index=correct_index,
                rationale=rationale,
                prompt=prompt,
            )

        # STAGE 18: Language Consistency (Hard for script violations, Soft for partial)
        s18_pass = True
        if locale in ("hi", "mr"):
            # Prompt and options must have Devanagari script presence
            has_dev = cls.contains_devanagari(prompt)
            opts_dev = all(cls.contains_devanagari(o) or any(tok in o.lower() for tok in TECHNICAL_WHITELIST_TOKENS) for o in options)
            s18_pass = has_dev and opts_dev
        elif locale == "en":
            # English prompt should not be contaminated with Devanagari
            s18_pass = not cls.contains_devanagari(prompt)

        stage_results = {
            "1_option_count": s1_pass,
            "2_option_distinctness": s2_pass,
            "3_valid_correct_index": s3_pass,
            "4_prompt_depth": s4_pass,
            "5_difficulty_alignment": s5_pass,
            "6_rationale_completeness": s6_pass,
            "7_distractor_quality": s7_pass,
            "8_content_safety": s8_pass,
            "9_competency_link": s9_pass,
            "10_blueprint_slot_alignment": s10_pass,
            "11_duplicate_detection": s11_pass,
            "12_test_artifact_detection": s12_pass,
            "13_question_type_validity": s13_pass,
            "14_target_proficiency_alignment": s14_pass,
            "15_scenario_context_relevance": s15_pass,
            "16_keyed_answer_plausibility": s16_pass,
            "17_semantic_answer_alignment": s17_pass,
            "18_language_consistency": s18_pass,
        }

        # Hard reject stages: 1, 2, 3, 4, 7, 8, 9, 10, 11, 12, 17, 18
        hard_stages = [
            "1_option_count", "2_option_distinctness", "3_valid_correct_index",
            "4_prompt_depth", "7_distractor_quality", "8_content_safety",
            "9_competency_link", "10_blueprint_slot_alignment",
            "11_duplicate_detection", "12_test_artifact_detection",
            "17_semantic_answer_alignment", "18_language_consistency"
        ]
        hard_failures = [k for k in hard_stages if not stage_results[k]]

        # Soft stages: 5, 6, 13, 14, 15, 16
        soft_stages = [
            "5_difficulty_alignment", "6_rationale_completeness",
            "13_question_type_validity", "14_target_proficiency_alignment",
            "15_scenario_context_relevance", "16_keyed_answer_plausibility"
        ]
        soft_failures = [k for k in soft_stages if not stage_results[k]]

        passed_count = sum(1 for v in stage_results.values() if v)
        is_valid = len(hard_failures) == 0

        return {
            "is_valid": is_valid,
            "passed_stages_count": passed_count,
            "total_stages": 18,
            "hard_failures": hard_failures,
            "soft_failures": soft_failures,
            "needs_review": len(soft_failures) > 0,
            "stage_17_reason": s17_reason,
            "stage_breakdown": stage_results,
        }

    @classmethod
    def validate_candidate_pool(
        cls,
        candidates: List[Dict[str, Any]],
        expected_competency_id: Optional[str] = None,
        allowed_competency_ids: Optional[Set[str]] = None,
        existing_prompts: Optional[List[str]] = None,
        locale: str = "en",
    ) -> List[Dict[str, Any]]:
        """
        Filters a candidate pool, returning only items that pass all hard validation stages.
        Attaches validation results to each candidate.

        CRITICAL REPAIR 1:
        Candidate items can NEVER self-assign expected_competency_id.
        The target slot or allowed slots MUST be provided by the blueprint / caller.
        """
        valid_items = []
        known_prompts = list(existing_prompts or [])

        for it in candidates:
            cand_comp = str(it.get("competency_id") or "")

            # Determine expected slot for validation
            if expected_competency_id is not None:
                target_expected = expected_competency_id
            elif allowed_competency_ids is not None:
                if cand_comp in allowed_competency_ids:
                    target_expected = cand_comp
                else:
                    # Outside allowed blueprint slots!
                    target_expected = "__REJECTED_DISALLOWED_SLOT__"
            else:
                target_expected = cand_comp if cand_comp in VALID_COMPETENCY_IDS else "__INVALID_FRAMEWORK_COMPETENCY__"

            res = cls.validate_item(
                item=it,
                expected_competency_id=target_expected,
                existing_prompts=known_prompts,
                locale=locale,
            )
            it["validation"] = res
            if res["is_valid"]:
                valid_items.append(it)
                known_prompts.append(it.get("prompt", ""))
            else:
                logger.warning(
                    f"[Validation Pipeline] Rejected candidate item. Hard failures: {res['hard_failures']}. Prompt: {it.get('prompt', '')[:50]}..."
                )

        return valid_items
