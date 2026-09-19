import re
import logging
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

VYREN_CORE_COMPETENCIES = [
    {
        "id": "c1000000-0000-0000-0000-000000000001",
        "name": "Statistical Inference",
        "category": "Data Analytics",
        "frac_code": "FRAC-DA-STAT-01",
        "keywords": [
            "statistic",
            "statistical",
            "sample",
            "sampling",
            "survey",
            "inference",
            "hypothesis",
            "national accounts",
            "gdp",
            "gva",
            "price index",
            "cpi",
            "wpi",
            "probability",
            "distribution",
            "variance",
            "estimation",
            "official statistics",
            "nssta",
            "mospi",
        ],
    },
    {
        "id": "c1000000-0000-0000-0000-000000000002",
        "name": "Data Pipeline Design",
        "category": "Data Engineering",
        "frac_code": "FRAC-DE-PIPE-02",
        "keywords": [
            "pipeline",
            "etl",
            "elt",
            "database",
            "sql",
            "stream",
            "batch",
            "data warehouse",
            "lakehouse",
            "orchestration",
            "idempotent",
            "kafka",
            "spark",
            "data ingestion",
            "data architecture",
            "infrastructure",
        ],
    },
    {
        "id": "c1000000-0000-0000-0000-000000000003",
        "name": "Machine Learning Ops",
        "category": "AI & ML",
        "frac_code": "FRAC-AI-MLOPS-03",
        "keywords": [
            "machine learning",
            "mlops",
            "deep learning",
            "artificial intelligence",
            "ai/ml",
            "neural",
            "model drift",
            "concept drift",
            "model deployment",
            "retraining",
            "feature store",
            "telemetry",
            "scikit",
            "tensorflow",
            "pytorch",
        ],
    },
    {
        "id": "c1000000-0000-0000-0000-000000000004",
        "name": "Data Governance",
        "category": "Data Management",
        "frac_code": "FRAC-DM-GOV-04",
        "keywords": [
            "data governance",
            "governance",
            "data privacy",
            "privacy",
            "compliance",
            "data quality",
            "data lineage",
            "catalog",
            "dpdp",
            "data ethics",
            "metadata",
            "security",
            "audit",
            "policy adherence",
        ],
    },
]


class CompetencyMapperService:
    """
    Deterministic mapping service linking external iGOT/Sunbird metadata to VYREN competencies.
    Preserves source tags for explainability and returns transparent confidence ratings.
    """

    @classmethod
    def map_course_to_competencies(
        cls,
        title: str,
        description: Optional[str] = None,
        competencies_v5: Optional[List[Dict[str, Any]]] = None,
    ) -> List[Dict[str, Any]]:
        """
        Map a course's Sunbird metadata to VYREN competencies.
        Returns a list of matched competency dicts with explainability metadata.
        """
        matched = {}
        combined_text = f"{title} {description or ''}".lower()

        # 1. First priority: explicit competencies_v5 from Sunbird payload
        if competencies_v5 and isinstance(competencies_v5, list):
            for c_entry in competencies_v5:
                tag_name = (
                    c_entry.get("competencyName")
                    or c_entry.get("name")
                    or c_entry.get("description")
                    or ""
                ).lower()
                if not tag_name:
                    continue

                for core in VYREN_CORE_COMPETENCIES:
                    cid = core["id"]
                    if core["name"].lower() in tag_name or core["frac_code"].lower() in tag_name:
                        matched[cid] = {
                            "competency_id": cid,
                            "competency_name": core["name"],
                            "frac_code": core["frac_code"],
                            "confidence": 1.0,
                            "matched_source": f"competencies_v5 tag: '{tag_name}'",
                            "is_primary": True,
                        }
                    else:
                        for kw in core["keywords"]:
                            if re.search(r"\b" + re.escape(kw) + r"\b", tag_name):
                                if cid not in matched or matched[cid]["confidence"] < 0.90:
                                    matched[cid] = {
                                        "competency_id": cid,
                                        "competency_name": core["name"],
                                        "frac_code": core["frac_code"],
                                        "confidence": 0.90,
                                        "matched_source": f"competencies_v5 tag keyword: '{kw}'",
                                        "is_primary": True,
                                    }

        # 2. Second priority: title and description keyword scoring
        for core in VYREN_CORE_COMPETENCIES:
            cid = core["id"]
            if cid in matched and matched[cid]["confidence"] >= 0.90:
                continue

            hit_count = 0
            matched_kws = []
            for kw in core["keywords"]:
                if re.search(r"\b" + re.escape(kw) + r"\b", combined_text):
                    hit_count += 1
                    matched_kws.append(kw)

            if hit_count > 0:
                # Calculate confidence based on hits and presence in title
                in_title = any(re.search(r"\b" + re.escape(kw) + r"\b", title.lower()) for kw in core["keywords"])
                confidence = 0.85 if in_title else min(0.75, 0.50 + (hit_count * 0.10))
                matched[cid] = {
                    "competency_id": cid,
                    "competency_name": core["name"],
                    "frac_code": core["frac_code"],
                    "confidence": round(confidence, 2),
                    "matched_source": f"text match on keywords: {', '.join(matched_kws[:3])}",
                    "is_primary": in_title or (cid not in matched),
                }

        # Sort by confidence descending
        results = sorted(matched.values(), key=lambda x: x["confidence"], reverse=True)
        return results

    @classmethod
    def get_competency_ids(cls, mapped_results: List[Dict[str, Any]]) -> List[str]:
        """Extract unique competency UUIDs from mapped results."""
        return [m["competency_id"] for m in mapped_results]

    @classmethod
    def get_primary_competency_id(cls, mapped_results: List[Dict[str, Any]]) -> Optional[str]:
        """Get the highest-confidence competency UUID or None."""
        if not mapped_results:
            return None
        return mapped_results[0]["competency_id"]

    @classmethod
    def score_text_against_competency(
        cls,
        text: str,
        competency_id: str,
        competency_keywords: Optional[List[str]] = None,
    ) -> float:
        """
        Calculates a normalized score (0.0 - 1.0) of how strongly a given text
        (e.g., responsibilities) aligns with a specific competency's domain keywords.
        """
        if not text:
            return 0.0

        keywords = competency_keywords
        if not keywords:
            for core in VYREN_CORE_COMPETENCIES:
                if core["id"] == competency_id:
                    keywords = core["keywords"]
                    break

        if not keywords:
            return 0.0

        lower_text = text.lower()
        hit_count = 0
        for kw in keywords:
            if re.search(r"\b" + re.escape(kw.lower()) + r"\b", lower_text):
                hit_count += 1

        if hit_count == 0:
            return 0.0
        # 1 hit = 0.35, 2 hits = 0.65, 3+ hits = 0.90 - 1.0
        return min(1.0, round(0.20 + (hit_count * 0.25), 2))

    @classmethod
    def score_tools_against_competency(
        cls,
        tools: List[str],
        competency_id: str,
    ) -> float:
        """
        Calculates a normalized alignment score (0.0 - 1.0) of tools/technologies
        against a specific competency domain.
        """
        if not tools:
            return 0.0

        tool_domain_mappings: Dict[str, List[str]] = {
            "c1000000-0000-0000-0000-000000000001": ["python", "r", "stata", "spss", "excel", "sas", "scipy", "statsmodels"],
            "c1000000-0000-0000-0000-000000000002": ["sql", "postgresql", "kafka", "spark", "airflow", "dbt", "etl", "data warehouse", "lakehouse"],
            "c1000000-0000-0000-0000-000000000003": ["scikit-learn", "scikit", "pytorch", "tensorflow", "mlflow", "docker", "kubeflow", "automl", "onnx"],
            "c1000000-0000-0000-0000-000000000004": ["collibra", "dpdp", "governance", "lineage", "catalog", "great expectations", "purview", "dama"],
        }

        domain_tools = tool_domain_mappings.get(competency_id, [])
        if not domain_tools:
            return 0.0

        hit_count = 0
        for t in tools:
            t_lower = t.lower()
            for dt in domain_tools:
                if dt in t_lower:
                    hit_count += 1
                    break

        if hit_count == 0:
            return 0.0
        return min(1.0, round(hit_count * 0.40, 2))

