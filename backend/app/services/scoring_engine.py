from typing import Dict, List, Any


def convert_score_to_level(score: float) -> int:
    """
    Explicit level conversion rule:
    0 - 24%   -> Level 0 (No demonstrated competency)
    25 - 49%  -> Level 1 (Foundational)
    50 - 69%  -> Level 2 (Developing)
    70 - 84%  -> Level 3 (Proficient)
    85 - 100% -> Level 4 (Advanced)
    """
    if score < 25.0:
        return 0
    elif score < 50.0:
        return 1
    elif score < 70.0:
        return 2
    elif score < 85.0:
        return 3
    else:
        return 4


def calculate_confidence(items_count: int, difficulty_levels: List[str]) -> float:
    """
    Confidence calculation:
    Based on quantity of evidence and difficulty variation.
    Range: 0.0 - 1.0
    NOTE: Confidence NEVER alters or modifies the performance score.
    """
    if items_count == 0:
        return 0.0
    
    # Base confidence by item count
    if items_count == 1:
        base = 0.60
    elif items_count == 2:
        base = 0.80
    elif items_count == 3:
        base = 0.90
    else:
        base = 0.95

    # Bonus for difficulty variation (evaluating across multiple difficulties)
    unique_difficulties = len(set(difficulty_levels))
    diff_bonus = 0.03 if unique_difficulties > 1 else 0.0

    return min(1.0, round(base + diff_bonus, 3))


RATIONALE_REGISTRY: Dict[str, str] = {
    "e1000000-0000-0000-0000-000000000001": (
        "Correct: We reject the null hypothesis — the result is statistically significant. "
        "A p-value measures the probability of observing results at least as extreme under H0. "
        "When p (0.03) is below alpha (0.05), we reject H0. It does NOT state the probability that H0 is true."
    ),
    "e1000000-0000-0000-0000-000000000002": (
        "Correct: Regularization (L1/L2) or Cross-Validation. "
        "Regularization penalizes complex model weights to mitigate overfitting and improve generalization on unseen test data."
    ),
    "e1000000-0000-0000-0000-000000000003": (
        "Correct: Idempotency. An idempotent data pipeline stage produces the exact same state regardless of "
        "how many times it is executed, preventing duplicate ingestion or corrupt aggregations."
    ),
    "e1000000-0000-0000-0000-000000000004": (
        "Correct: Model drift occurs when real-world data distribution changes over time, causing production model accuracy degradation."
    ),
    "e1000000-0000-0000-0000-000000000005": (
        "Correct: Data lineage tracks the lifecycle, transformation history, and ownership of data assets across enterprise pipelines."
    ),
    "e1000000-0000-0000-0000-000000000010": (
        "MoSPI NSS methodology: First Stage Units (census villages / urban blocks) cluster geographic traversal "
        "to optimize field costs while multi-stage probability sampling preserves design-unbiased domain estimates with calculated multipliers."
    ),
    "e1000000-0000-0000-0000-000000000011": (
        "Horvitz-Thompson estimation: In NSS surveys, the sampling weight (multiplier) is the reciprocal of inclusion probability (1/pi_i). "
        "Applying multipliers inflates sample observations to true universe totals without sample selection bias."
    ),
    "e1000000-0000-0000-0000-000000000012": (
        "Consumer Price Index compilation: MoSPI uses the Modified Laspeyres formula with fixed base-year consumption expenditure weights "
        "to aggregate price relatives across commodity baskets consistently over time."
    ),
    "e1000000-0000-0000-0000-000000000013": (
        "CPI market replacement protocol: Missing item specifications require comparable substitution with base-price imputation (overlap splicing) "
        "to prevent quality shifts from being erroneously registered as consumer price inflation."
    ),
    "e1000000-0000-0000-0000-000000000014": (
        "National Accounts (SNA 2008 / MoSPI): GDP at Market Prices = GVA at Basic Prices + (Product Taxes - Product Subsidies). "
        "Production taxes/subsidies are included within GVA at basic prices, whereas product taxes/subsidies apply to final market output."
    ),
    "e1000000-0000-0000-0000-000000000015": (
        "Real Output Deflation: Double deflation deflates gross output with output indices and intermediate inputs with input indices separately, "
        "preventing terms-of-trade distortions inherent in single deflation."
    ),
}


class ScoringEngine:
    @staticmethod
    def evaluate_submission(
        assessment_items: List[dict],
        answers_dict: Dict[str, int],
    ) -> Dict[str, Any]:
        """
        Evaluates assessment submission deterministically.
        
        Returns:
          - overall_score: weighted average across all competencies (0-100)
          - competency_breakdown: dict by competency_id mapping score, level, confidence, and item log
          - item_log: detailed response audit trail
        """
        item_log = []
        competency_groups: Dict[str, List[dict]] = {}

        for item in assessment_items:
            item_id = str(item["id"])
            comp_id = str(item["competency_id"])
            weight = float(item.get("weight", 1.0))
            correct_index = int(item["correct_index"])
            difficulty = item.get("difficulty", "MEDIUM")
            options = item.get("options") or []
            prompt = item.get("prompt", "")

            learner_answer = answers_dict.get(item_id)
            is_correct = (learner_answer is not None) and (learner_answer == correct_index)

            correct_text = options[correct_index] if (0 <= correct_index < len(options)) else "Standard Key"
            learner_text = (
                options[learner_answer]
                if (learner_answer is not None and 0 <= learner_answer < len(options))
                else "Unanswered / Timer Expired"
            )

            explanation = (
                item.get("explanation")
                or RATIONALE_REGISTRY.get(item_id)
                or f"Correct: '{correct_text}'. Under MoSPI competency standards, this principle ensures reproducible, statistically valid, and fault-tolerant data operations."
            )

            logged_item = {
                "item_id": item_id,
                "target_competency_id": comp_id,
                "prompt": prompt,
                "options": options,
                "learner_answer": learner_answer,
                "learner_answer_text": learner_text,
                "correct_answer": correct_index,
                "correct_answer_text": correct_text,
                "is_correct": is_correct,
                "weight": weight,
                "difficulty": difficulty,
                "explanation": explanation,
            }
            item_log.append(logged_item)

            if comp_id not in competency_groups:
                competency_groups[comp_id] = []
            competency_groups[comp_id].append(logged_item)

        competency_breakdown = {}
        total_weighted_earned = 0.0
        total_weight_possible = 0.0

        for comp_id, items in competency_groups.items():
            earned_weight = sum(it["weight"] for it in items if it["is_correct"])
            possible_weight = sum(it["weight"] for it in items)

            score = (earned_weight / possible_weight * 100.0) if possible_weight > 0 else 0.0
            score = round(score, 2)

            measured_level = convert_score_to_level(score)
            difficulties = [it["difficulty"] for it in items]
            confidence = calculate_confidence(len(items), difficulties)

            competency_breakdown[comp_id] = {
                "competency_id": comp_id,
                "score": score,
                "measured_level": measured_level,
                "confidence": confidence,
                "items_evaluated": len(items),
                "correct_items": sum(1 for it in items if it["is_correct"]),
                "total_earned_weight": earned_weight,
                "total_possible_weight": possible_weight,
            }

            total_weighted_earned += earned_weight
            total_weight_possible += possible_weight

        overall_score = (
            (total_weighted_earned / total_weight_possible * 100.0)
            if total_weight_possible > 0
            else 0.0
        )
        overall_score = round(overall_score, 2)

        return {
            "overall_score": overall_score,
            "competency_breakdown": competency_breakdown,
            "item_log": item_log,
        }
