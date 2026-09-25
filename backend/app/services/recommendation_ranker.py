"""
VYREN — Recommendation Ranker
==============================
Deterministic, explainable ranking of skill gaps for recommendation generation.

Governing principle:
  "Context personalizes the diagnostic. Performance determines the measured competency."

Ranking hierarchy (descending importance):
  1. Priority tier          — HIGH > MEDIUM > LOW/NONE
  2. Gap magnitude          — larger required_level - current_level ranks higher
  3. Confidence/evidence    — higher measured confidence ranks higher (lower uncertainty)
  4. Context relevance      — target_competency selection + responsibilities/tools alignment
  5. Stable tie-breaker     — competency_id (canonical, database-order-independent)

Performance (measured gap) is always the primary signal.
Contextual signals are secondary tie-breakers only.
"""

import logging
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

# Priority numeric weight — must remain ordinal
_PRIORITY_WEIGHT = {"HIGH": 3, "MEDIUM": 2, "LOW": 1, "NONE": 0}


def rank_gaps_for_recommendation(
    gap_matrix: List[Dict[str, Any]],
    competency_scores: Optional[Dict[str, Dict[str, Any]]] = None,
    profile: Optional[Dict[str, Any]] = None,
) -> List[Dict[str, Any]]:
    """
    Rank skill gaps deterministically for recommendation generation.

    Parameters
    ----------
    gap_matrix : list of gap dicts from GapEngine.compute_all_gaps()
        Each gap must contain: competency_id, priority, gap_size, current_level,
        required_level, competency_name.
    competency_scores : optional dict keyed by competency_id containing
        {score, measured_level, confidence, items_evaluated, ...}
        from ScoringEngine.evaluate_submission() competency_breakdown.
    profile : optional learner profile dict containing target_competencies,
        responsibilities, tools_experience. Used only as secondary tie-breakers.

    Returns
    -------
    list of gap dicts sorted by recommendation priority, most important first.
    Only gaps with priority HIGH or MEDIUM are included in the output.
    """
    scores = competency_scores or {}
    target_comps = set()
    resp_text = ""
    tools_list: List[str] = []

    if profile:
        raw_targets = profile.get("target_competencies") or []
        target_comps = set(str(c) for c in raw_targets)
        resp_text = (profile.get("responsibilities") or "").lower()
        tools_list = [t.lower() for t in (profile.get("tools_experience") or [])]

    active_gaps = [
        g for g in gap_matrix
        if g.get("priority") in ("HIGH", "MEDIUM")
    ]

    def _sort_key(gap: Dict[str, Any]):
        cid = str(gap.get("competency_id", ""))
        priority_score = _PRIORITY_WEIGHT.get(gap.get("priority", "NONE"), 0)
        gap_size = int(gap.get("gap_size", 0))

        # Signal 3: confidence from scoring evidence (higher = ranked first = negative for sorting)
        score_data = scores.get(cid, {})
        confidence = float(score_data.get("confidence", 0.0))

        # Signal 4a: target competency explicit selection
        context_target = 1 if cid in target_comps else 0

        # Signal 4b: responsibilities keyword alignment (reuse existing keywords from VYREN_CORE)
        context_resp = _score_responsibilities(resp_text, cid)

        # Signal 4c: tool alignment
        context_tools = _score_tools(tools_list, cid)

        # Composite context score (0.0 – 1.0)
        context_score = round(
            context_target * 0.50 + context_resp * 0.30 + context_tools * 0.20,
            4,
        )

        # Sorting tuple: all descending → negate for ascending sort
        # (priority_score, gap_size, confidence, context_score, stable_id)
        return (
            -priority_score,
            -gap_size,
            -round(confidence, 4),
            -context_score,
            cid,              # stable final tie-breaker, ascending (lexicographic)
        )

    ranked = sorted(active_gaps, key=_sort_key)

    # Structured log: first 4 slots
    for idx, gap in enumerate(ranked[:4]):
        cid = str(gap.get("competency_id", ""))
        logger.info(
            "recommendation_rank: slot=%d competency_id=%s competency=%s "
            "priority=%s gap_size=%d",
            idx + 1,
            cid,
            gap.get("competency_name", ""),
            gap.get("priority", ""),
            gap.get("gap_size", 0),
        )

    return ranked


# ---------------------------------------------------------------------------
# Internal helpers — simple keyword alignment, NOT AI/ML
# ---------------------------------------------------------------------------

_COMPETENCY_KEYWORDS: Dict[str, List[str]] = {
    "c1000000-0000-0000-0000-000000000001": [
        "statistic", "statistical", "sample", "survey", "inference",
        "hypothesis", "gdp", "cpi", "probability", "estimation",
        "national accounts", "official statistics",
    ],
    "c1000000-0000-0000-0000-000000000002": [
        "pipeline", "etl", "elt", "database", "sql", "stream", "batch",
        "data warehouse", "lakehouse", "orchestration", "data ingestion",
        "infrastructure", "spark", "kafka",
    ],
    "c1000000-0000-0000-0000-000000000003": [
        "machine learning", "mlops", "deep learning", "artificial intelligence",
        "model drift", "model deployment", "retraining", "neural",
        "scikit", "tensorflow", "pytorch",
    ],
    "c1000000-0000-0000-0000-000000000004": [
        "data governance", "governance", "data privacy", "privacy", "compliance",
        "data quality", "data lineage", "catalog", "data ethics",
        "metadata", "security", "audit", "policy",
    ],
}

_TOOL_KEYWORDS: Dict[str, List[str]] = {
    "c1000000-0000-0000-0000-000000000001": [
        "python", "r", "stata", "spss", "excel", "sas", "scipy", "statsmodels",
    ],
    "c1000000-0000-0000-0000-000000000002": [
        "sql", "postgresql", "kafka", "spark", "airflow", "dbt", "etl",
        "data warehouse", "lakehouse",
    ],
    "c1000000-0000-0000-0000-000000000003": [
        "scikit", "pytorch", "tensorflow", "mlflow", "docker", "kubeflow",
        "automl", "onnx",
    ],
    "c1000000-0000-0000-0000-000000000004": [
        "collibra", "dpdp", "governance", "lineage", "catalog",
        "great expectations", "purview", "dama",
    ],
}


def _score_responsibilities(resp_lower: str, competency_id: str) -> float:
    """Score (0–1) how strongly responsibilities text aligns with a competency."""
    if not resp_lower:
        return 0.0
    keywords = _COMPETENCY_KEYWORDS.get(competency_id, [])
    hits = sum(1 for kw in keywords if kw in resp_lower)
    if hits == 0:
        return 0.0
    return min(1.0, round(0.20 + hits * 0.20, 2))


def _score_tools(tools_lower: List[str], competency_id: str) -> float:
    """Score (0–1) how strongly the learner's tools align with a competency."""
    if not tools_lower:
        return 0.0
    domain_tools = _TOOL_KEYWORDS.get(competency_id, [])
    hits = sum(1 for t in tools_lower for dt in domain_tools if dt in t)
    if hits == 0:
        return 0.0
    return min(1.0, round(hits * 0.40, 2))


def build_course_search_query(
    competency_name: str,
    profile: Optional[Dict[str, Any]] = None,
    max_length: int = 120,
) -> str:
    """
    Build a concise, meaningful iGOT/Sunbird search query.

    Always includes the competency name. Appends relevant designation,
    responsibility keywords, and tools where they materially relate to the
    competency domain. Never includes passwords, IDs, auth tokens, or
    unrelated private information.

    Parameters
    ----------
    competency_name : str
        The VYREN competency name to search for (e.g., "Data Governance").
    profile : optional learner profile dict.
    max_length : int
        Soft limit on query string length to avoid excessively broad searches.

    Returns
    -------
    str : the query string to pass to IGOTClientService.search_courses()
    """
    parts = [competency_name]

    if profile:
        designation = (profile.get("designation") or "").strip()
        # Include designation only if not too long / generic
        if designation and len(designation) <= 60:
            parts.append(designation)

        responsibilities = (profile.get("responsibilities") or "").lower()
        if responsibilities:
            # Extract up to 3 relevant keywords from responsibilities
            comp_lower = competency_name.lower()
            # Find the right keyword set for this competency by name matching
            kws_for_comp: List[str] = []
            for cid, kws in _COMPETENCY_KEYWORDS.items():
                if any(kw in comp_lower for kw in kws) or any(
                    kw in comp_lower for kw in [cid[-2:]]  # rough match
                ):
                    kws_for_comp = kws
                    break
            # Also try by competency name directly
            if not kws_for_comp:
                for cid, kws in _COMPETENCY_KEYWORDS.items():
                    if competency_name.lower() in " ".join(kws):
                        kws_for_comp = kws
                        break
            matched_resp_kws = [
                kw for kw in kws_for_comp
                if len(kw) > 4 and kw in responsibilities  # skip very short keywords
            ][:3]
            parts.extend(matched_resp_kws)

        # Relevant tools — only include tools that map to this competency's domain
        tools = [t.lower() for t in (profile.get("tools_experience") or [])]
        if tools:
            comp_id_key = _get_competency_id_by_name(competency_name)
            domain_tools = _TOOL_KEYWORDS.get(comp_id_key, [])
            matched_tools = [t for t in tools for dt in domain_tools if dt in t][:2]
            parts.extend(matched_tools)

    query = " ".join(p for p in parts if p)
    # Truncate to soft limit while keeping whole words
    if len(query) > max_length:
        query = query[:max_length].rsplit(" ", 1)[0]

    logger.debug(
        "igot_search_query_built: competency=%s query=%r",
        competency_name,
        query,
    )
    return query


def _get_competency_id_by_name(competency_name: str) -> str:
    """Return the VYREN canonical competency_id for a given competency name."""
    name_lower = competency_name.lower()
    # Exact match first
    _NAME_TO_ID = {
        "statistical inference": "c1000000-0000-0000-0000-000000000001",
        "data pipeline design": "c1000000-0000-0000-0000-000000000002",
        "machine learning ops": "c1000000-0000-0000-0000-000000000003",
        "data governance": "c1000000-0000-0000-0000-000000000004",
    }
    return _NAME_TO_ID.get(name_lower, "")


def get_tiered_search_queries(
    competency_name: str,
    profile: Optional[Dict[str, Any]] = None,
) -> List[tuple[str, str]]:
    """
    Build ordered search query tiers for generic iGOT/Sunbird querying.

    Tier 1: Contextually enriched query (competency + designation + tools).
    Tier 2: Clean competency name fallback (e.g., "Data Pipeline Design").

    Returns
    -------
    list of (tier_label, query_string) tuples in execution order.
    Deduplicates if Tier 1 query is already identical to the clean competency name.
    """
    clean_comp = competency_name.strip()
    tier1_query = build_course_search_query(competency_name, profile=profile).strip()

    tiers: List[tuple[str, str]] = []
    if tier1_query:
        tiers.append(("Tier 1 (contextual)", tier1_query))

    # Add Tier 2 fallback if Tier 1 is absent or different from clean competency name
    if not tiers or tiers[0][1].lower() != clean_comp.lower():
        tiers.append(("Tier 2 (competency-only)", clean_comp))

    return tiers
