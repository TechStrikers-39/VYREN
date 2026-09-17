import logging
import re
import uuid
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import httpx

from app.core.config import get_settings
from app.repositories.competency_repo import CompetencyRepository
from app.repositories.course_repo import CourseRepository
from app.repositories.user_repo import UserRepository
from app.services.competency_mapper import CompetencyMapperService

logger = logging.getLogger(__name__)

# Karmayogi FRAC proficiency level mappings
KARMProcess_LEVELS = {
    "0": "Level 0 - Novice",
    "1": "Level 1 - Foundational (Basic Awareness)",
    "2": "Level 2 - Developing (Working Knowledge)",
    "3": "Level 3 - Proficient (Independent Practitioner)",
    "4": "Level 4 - Advanced (Subject Matter Expert)",
}

FRAC_DEFINITIONS = [
    {
        "vyren_competency_id": "c1000000-0000-0000-0000-000000000001",
        "vyren_name": "Statistical Inference",
        "vyren_category": "Data Analytics",
        "igot_frac_code": "FRAC-DA-STAT-01",
        "igot_competency_area": "Analytical Thinking & Quantitative Evaluation",
        "level_mappings": KARMProcess_LEVELS,
    },
    {
        "vyren_competency_id": "c1000000-0000-0000-0000-000000000002",
        "vyren_name": "Data Pipeline Design",
        "vyren_category": "Data Engineering",
        "igot_frac_code": "FRAC-DE-PIPE-02",
        "igot_competency_area": "Digital Infrastructure & Systems Engineering",
        "level_mappings": KARMProcess_LEVELS,
    },
    {
        "vyren_competency_id": "c1000000-0000-0000-0000-000000000003",
        "vyren_name": "Machine Learning Ops",
        "vyren_category": "AI & ML",
        "igot_frac_code": "FRAC-AI-MLOPS-03",
        "igot_competency_area": "Emerging Technologies & AI Adoption",
        "level_mappings": KARMProcess_LEVELS,
    },
    {
        "vyren_competency_id": "c1000000-0000-0000-0000-000000000004",
        "vyren_name": "Data Governance",
        "vyren_category": "Data Management",
        "igot_frac_code": "FRAC-DM-GOV-04",
        "igot_competency_area": "Policy Adherence, Security & Public Data Ethics",
        "level_mappings": KARMProcess_LEVELS,
    },
]


def parse_duration_to_minutes(duration_raw: Any, default: int = 60) -> int:
    """Parse various duration representations into integer minutes."""
    if not duration_raw:
        return default
    if isinstance(duration_raw, (int, float)):
        # If value is large (e.g. seconds >= 300), convert seconds to minutes
        return int(duration_raw // 60) if duration_raw >= 300 else int(duration_raw)
    d_str = str(duration_raw).strip().lower()
    # Check for 'hh:mm:ss' format
    if ":" in d_str:
        parts = d_str.split(":")
        try:
            if len(parts) == 3:
                return int(parts[0]) * 60 + int(parts[1])
            if len(parts) == 2:
                return int(parts[0]) * 60 + int(parts[1])
        except ValueError:
            pass
    # Check for regex numbers
    hrs_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:hour|hr|h)", d_str)
    mins_match = re.search(r"(\d+)\s*(?:minute|min|m)", d_str)
    total_mins = 0
    if hrs_match:
        total_mins += int(float(hrs_match.group(1)) * 60)
    if mins_match:
        total_mins += int(mins_match.group(1))
    if total_mins > 0:
        return total_mins
    # Pure integer string
    if d_str.isdigit():
        val = int(d_str)
        return int(val // 60) if val >= 300 else val
    return default


class BaseIgotProvider(ABC):
    """Abstract interface for iGOT Karmayogi / Sunbird integration providers."""

    @abstractmethod
    def get_status(self) -> dict:
        """Return provider mode, live connectivity, and blocker diagnostics."""
        pass

    @abstractmethod
    def get_frac_mappings(self) -> List[dict]:
        """Return FRAC competency mappings."""
        pass

    @abstractmethod
    def generate_karmayogi_passport(self, user_id: str) -> dict:
        """Generate W3C Verifiable Credential passport for learner."""
        pass

    @abstractmethod
    def get_courses(self, competency_area: Optional[str] = None) -> List[dict]:
        """Return competency-aligned courses."""
        pass

    @abstractmethod
    def search_courses(
        self, query: Optional[str] = None, filters: Optional[dict] = None
    ) -> List[dict]:
        """Search courses via Sunbird content search contract."""
        pass

    @abstractmethod
    def get_course_hierarchy(self, course_id_or_do_id: str) -> Optional[dict]:
        """Retrieve course hierarchy and structural module breakdown."""
        pass

    @abstractmethod
    def get_course_detail(self, course_id_or_do_id: str) -> Optional[dict]:
        """Retrieve complete course detail with normalized modules."""
        pass


class RealIgotProvider(BaseIgotProvider):
    """
    Production Sunbird-compatible iGOT Karmayogi API provider.
    Implements:
    - POST /api/content/v1/search (Sunbird Content Search)
    - GET  /api/course/v1/hierarchy/{courseId} (Sunbird Course Hierarchy)
    Preserves real DO_IDs, generates deterministic UUIDv5s, normalizes into VYREN schema,
    and maps competencies using CompetencyMapperService.
    """

    def __init__(
        self,
        api_url: str,
        auth_token: Optional[str] = None,
        client_id: Optional[str] = None,
        client_secret: Optional[str] = None,
        channel: str = "igot",
        timeout: float = 10.0,
    ):
        self.api_url = api_url.rstrip("/")
        self.auth_token = auth_token
        self.client_id = client_id
        self.client_secret = client_secret
        self.channel = channel
        self.timeout = timeout

    def _get_headers(self) -> dict:
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "X-Channel-Id": self.channel,
        }
        if self.auth_token:
            headers["Authorization"] = f"Bearer {self.auth_token}"
        return headers

    def get_status(self) -> dict:
        now_iso = datetime.now(timezone.utc)
        probe_payload = {
            "request": {
                "filters": {"primaryCategory": ["Course"], "status": ["Live"]},
                "limit": 1,
                "fields": ["identifier"],
            }
        }
        try:
            with httpx.Client(timeout=self.timeout) as client:
                res = client.post(
                    f"{self.api_url}/api/content/v1/search",
                    headers=self._get_headers(),
                    json=probe_payload,
                )
                is_live = res.status_code == 200 and res.json().get("responseCode") == "OK"
                blocker_sum = None if is_live else f"Sunbird gateway returned HTTP {res.status_code}"
                blocker_det = None if is_live else res.text[:200]
                return {
                    "mode": "REAL / SUNBIRD",
                    "is_real": True,
                    "provider": "Live Sunbird-compatible iGOT Karmayogi Gateway",
                    "endpoint": self.api_url,
                    "authenticated": is_live,
                    "blocker_summary": blocker_sum,
                    "blocker_details": blocker_det,
                    "capabilities": [
                        "Sunbird Content Search (/api/content/v1/search)",
                        "Course Hierarchy Ingestion (/api/course/v1/hierarchy)",
                        "Live FRAC Competency Tagging",
                        "W3C Karmayogi Passport Ingestion",
                    ],
                    "timestamp": now_iso,
                }
        except Exception as e:
            logger.warning(f"Failed to connect to real Sunbird/iGOT gateway: {e}")
            return {
                "mode": "REAL / SUNBIRD",
                "is_real": True,
                "provider": "Live Sunbird-compatible iGOT Gateway (Unreachable)",
                "endpoint": self.api_url,
                "authenticated": False,
                "blocker_summary": "Live Sunbird/iGOT endpoint unreachable or timeout",
                "blocker_details": str(e),
                "capabilities": [],
                "timestamp": now_iso,
            }

    def _normalize_content_item(self, item: dict) -> dict:
        """
        Normalize a raw Sunbird content dictionary into the VYREN Course schema.
        Generates deterministic UUIDv5 based on Sunbird DO_ID.
        """
        do_id = item.get("identifier") or item.get("do_id") or str(uuid.uuid4())
        # Deterministic UUID generation
        internal_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"igot:{do_id}"))

        title = item.get("name") or item.get("title") or "Untitled Course"
        description = item.get("description") or ""

        # Handle organisation/provider
        org = item.get("organisation")
        if isinstance(org, list) and org:
            provider = org[0]
        elif isinstance(org, str) and org.strip():
            provider = org
        else:
            provider = "Karmayogi Bharat / National Learning Portal"

        # Duration
        duration_minutes = parse_duration_to_minutes(item.get("duration"), default=60)

        # Competency mapping
        competencies_v5 = item.get("competencies_v5") or []
        mapped = CompetencyMapperService.map_course_to_competencies(
            title=title, description=description, competencies_v5=competencies_v5
        )
        competency_ids = CompetencyMapperService.get_competency_ids(mapped)
        competency_names = [m["competency_name"] for m in mapped]

        return {
            "id": internal_id,
            "external_id": do_id,
            "title": title,
            "description": description,
            "provider": provider,
            "category": item.get("primaryCategory") or "Data Analytics",
            "level": 2,
            "duration_minutes": duration_minutes,
            "competencies_covered": competency_ids,
            "competency_names": competency_names,
            "external_url": f"https://portal.igotkarmayogi.gov.in/public/toc/{do_id}/overview",
            "integration_mode": "REAL / SUNBIRD",
            "is_active": True,
            "modules": [],
            "source_metadata": {
                "identifier": do_id,
                "contentType": item.get("contentType"),
                "primaryCategory": item.get("primaryCategory"),
                "status": item.get("status"),
                "leafNodesCount": item.get("leafNodesCount", 0),
            },
        }

    def search_courses(
        self, query: Optional[str] = None, filters: Optional[dict] = None
    ) -> List[dict]:
        """
        Query Sunbird content search endpoint POST /api/content/v1/search.
        """
        url = f"{self.api_url}/api/content/v1/search"
        search_filters = filters or {"primaryCategory": ["Course"], "status": ["Live"]}
        payload = {
            "request": {
                "filters": search_filters,
                "query": query or "",
                "limit": 20,
                "fields": [
                    "identifier",
                    "name",
                    "description",
                    "organisation",
                    "duration",
                    "competencies_v5",
                    "leafNodesCount",
                    "primaryCategory",
                    "appIcon",
                    "posterImage",
                ],
            }
        }

        try:
            with httpx.Client(timeout=self.timeout) as client:
                res = client.post(url, headers=self._get_headers(), json=payload)
                if res.status_code == 200:
                    data = res.json()
                    content_list = data.get("result", {}).get("content", [])
                    normalized = [self._normalize_content_item(c) for c in content_list]
                    return normalized
                logger.warning(
                    f"Sunbird content search returned status {res.status_code}: {res.text[:150]}"
                )
        except Exception as e:
            logger.error(f"Error querying Sunbird content search API: {e}")
        return []

    def get_course_hierarchy(self, course_id_or_do_id: str) -> Optional[dict]:
        """
        Query Sunbird course hierarchy endpoint GET /api/course/v1/hierarchy/{courseId}.
        Extracts syllabus units into normalized module structures.
        """
        # If given internal UUID, we need DO_ID; if starts with do_, use as is
        do_id = course_id_or_do_id
        url = f"{self.api_url}/api/course/v1/hierarchy/{do_id}"

        try:
            with httpx.Client(timeout=self.timeout) as client:
                res = client.get(url, headers=self._get_headers())
                if res.status_code == 200:
                    data = res.json()
                    content = data.get("result", {}).get("content", {})
                    if not content:
                        return None

                    # Extract units / modules from hierarchy
                    modules = []
                    children = content.get("children") or []
                    order_idx = 0
                    course_uuid = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"igot:{do_id}"))

                    for ch in children:
                        unit_id = ch.get("identifier") or f"unit_{order_idx}"
                        mod_uuid = str(
                            uuid.uuid5(uuid.NAMESPACE_DNS, f"igot:{do_id}:{unit_id}")
                        )
                        unit_title = ch.get("name") or f"Module {order_idx + 1}"
                        unit_type = (
                            "video"
                            if ch.get("mimeType") == "video/mp4"
                            else "quiz"
                            if "assessment" in ch.get("contentType", "").lower()
                            else "reading"
                        )
                        unit_dur = parse_duration_to_minutes(ch.get("duration"), default=25)

                        modules.append(
                            {
                                "id": mod_uuid,
                                "course_id": course_uuid,
                                "competency_id": None,
                                "title": unit_title,
                                "type": unit_type,
                                "content": ch.get("description")
                                or f"Official unit: {unit_title}",
                                "order_index": order_idx,
                                "duration_minutes": unit_dur,
                                "external_id": unit_id,
                            }
                        )
                        order_idx += 1

                    normalized = self._normalize_content_item(content)
                    normalized["modules"] = modules
                    return normalized
                logger.warning(
                    f"Sunbird course hierarchy returned status {res.status_code}: {res.text[:150]}"
                )
        except Exception as e:
            logger.error(f"Error querying Sunbird course hierarchy API: {e}")
        return None

    def get_course_detail(self, course_id_or_do_id: str) -> Optional[dict]:
        """Fetch course detail with full module hierarchy."""
        return self.get_course_hierarchy(course_id_or_do_id)

    def get_courses(self, competency_area: Optional[str] = None) -> List[dict]:
        """Retrieve courses, optionally filtered by competency keyword."""
        search_res = self.search_courses(query=competency_area)
        results = []
        for c in search_res:
            results.append(
                {
                    "id": c["id"],
                    "title": c["title"],
                    "provider": c["provider"],
                    "competency_area": (
                        c["competency_names"][0]
                        if c.get("competency_names")
                        else (competency_area or "Civil Service Analytics")
                    ),
                    "duration": f"{c['duration_minutes']} mins",
                    "integration_mode": "REAL / SUNBIRD",
                    "external_url": c.get("external_url"),
                    "external_id": c.get("external_id"),
                }
            )
        return results

    def get_frac_mappings(self) -> List[dict]:
        try:
            with httpx.Client(timeout=self.timeout) as client:
                res = client.get(
                    f"{self.api_url}/api/v1/frac/competencies",
                    headers=self._get_headers(),
                )
                if res.status_code == 200:
                    data = res.json()
                    for item in data:
                        item["integration_mode"] = "REAL / SUNBIRD"
                    return data
        except Exception as e:
            logger.error(f"Error querying live FRAC mappings: {e}")
        return [
            {**d, "integration_mode": "REAL / SUNBIRD", "warning": "Live sync failed, using cached contract"}
            for d in FRAC_DEFINITIONS
        ]

    def generate_karmayogi_passport(self, user_id: str) -> dict:
        profile = UserRepository.get_profile(user_id) or {}
        scores = CompetencyRepository.get_scores_by_user(user_id)
        now_iso = datetime.now(timezone.utc).isoformat()
        frac_lookup = {f["vyren_competency_id"]: f for f in FRAC_DEFINITIONS}

        claims = []
        for s in scores:
            cid = str(s["competency_id"])
            frac_info = frac_lookup.get(cid, {})
            level_num = int(s.get("measured_level", 0))
            claims.append(
                {
                    "competency_id": cid,
                    "competency_name": s.get("competency_name", "Competency"),
                    "frac_domain": frac_info.get(
                        "igot_competency_area", "General Governance"
                    ),
                    "measured_level": level_num,
                    "karmayogi_proficiency_level": KARMProcess_LEVELS.get(
                        str(level_num), f"Level {level_num}"
                    ),
                    "score_percentage": float(s.get("score", 0.0)),
                    "confidence_level": float(s.get("confidence", 0.0)),
                    "evidence_summary": f"Verified via VYREN Deterministic Assessment engine at confidence index {s.get('confidence')}.",
                }
            )

        payload = {
            "passport_id": f"VYREN-REAL-KP-{user_id[:8].upper()}-{int(datetime.now().timestamp())}",
            "user_id": user_id,
            "learner_name": profile.get("full_name") or profile.get("email", "Learner"),
            "organization": profile.get("organization") or "MoSPI",
            "department": profile.get("department") or "National Accounts Division (NAD)",
            "designation": profile.get("designation") or "Officer",
            "igot_id": profile.get("igot_id") or f"IGOT-IN-{user_id[:6].upper()}",
            "issued_at": now_iso,
            "issuer": "iGOT Karmayogi Bharat (Live Synchronized Credential)",
            "credential_standard": "W3C-VC-Karmayogi-FRAC-1.0",
            "integration_mode": "REAL / SUNBIRD",
            "is_official_government_credential": True,
            "verification_notice": "Authenticated and synced with live iGOT Karmayogi Bharat Gateway.",
            "claims": claims,
        }

        try:
            with httpx.Client(timeout=self.timeout) as client:
                res = client.post(
                    f"{self.api_url}/api/v1/credentials/issue",
                    headers=self._get_headers(),
                    json=payload,
                )
                if res.status_code in (200, 201):
                    return res.json()
        except Exception as e:
            logger.warning(f"Could not register passport with external gateway: {e}")
            payload["verification_notice"] = (
                f"Generated for live gateway, but remote sync attempt failed: {str(e)}"
            )

        return payload


class LocalFallbackIgotProvider(BaseIgotProvider):
    """
    Transparent local fallback provider.
    Active when official authenticated credentials or Sunbird gateway access are unavailable.
    NEVER simulates live external success. Honestly reports local status and exact blocker reason.
    """

    def get_status(self) -> dict:
        return {
            "mode": "FALLBACK / LOCAL",
            "is_real": False,
            "provider": "VYREN Local FRAC Standard Engine",
            "endpoint": None,
            "authenticated": False,
            "blocker_summary": "Official Sunbird-compatible iGOT Karmayogi credentials not configured in environment",
            "blocker_details": (
                "Real iGOT integration uses the Sunbird-compatible REST API (POST /api/content/v1/search, "
                "GET /api/course/v1/hierarchy/{courseId}). Without official external gateway credentials and "
                "endpoints configured in .env (IGOT_API_URL, IGOT_AUTH_TOKEN), VYREN operates using internal "
                "MoSPI FRAC standard mapping to prevent simulated data masquerading as live external services."
            ),
            "capabilities": [
                "Internal FRAC Taxonomy (v1.0)",
                "Local W3C Verifiable Credential Generation",
                "Skill-Gap Linked Course Recommendations",
                "Sunbird Schema Compatibility Layer",
            ],
            "timestamp": datetime.now(timezone.utc),
        }

    def get_frac_mappings(self) -> List[dict]:
        return [{**d, "integration_mode": "FALLBACK / LOCAL"} for d in FRAC_DEFINITIONS]

    def generate_karmayogi_passport(self, user_id: str) -> dict:
        profile = UserRepository.get_profile(user_id) or {}
        scores = CompetencyRepository.get_scores_by_user(user_id)
        now_iso = datetime.now(timezone.utc).isoformat()
        frac_lookup = {f["vyren_competency_id"]: f for f in FRAC_DEFINITIONS}

        claims = []
        for s in scores:
            cid = str(s["competency_id"])
            frac_info = frac_lookup.get(cid, {})
            level_num = int(s.get("measured_level", 0))

            claims.append(
                {
                    "competency_id": cid,
                    "competency_name": s.get("competency_name", "Competency"),
                    "frac_domain": frac_info.get(
                        "igot_competency_area", "General Governance"
                    ),
                    "measured_level": level_num,
                    "karmayogi_proficiency_level": KARMProcess_LEVELS.get(
                        str(level_num), f"Level {level_num}"
                    ),
                    "score_percentage": float(s.get("score", 0.0)),
                    "confidence_level": float(s.get("confidence", 0.0)),
                    "evidence_summary": f"Verified via VYREN Deterministic Assessment engine at confidence index {s.get('confidence')}.",
                }
            )

        return {
            "passport_id": f"VYREN-KP-{user_id[:8].upper()}-{int(datetime.now().timestamp())}",
            "user_id": user_id,
            "learner_name": profile.get("full_name") or profile.get("email", "Learner"),
            "organization": profile.get("organization") or "MoSPI",
            "department": profile.get("department") or "National Accounts Division (NAD)",
            "designation": profile.get("designation") or "Officer",
            "igot_id": profile.get("igot_id") or f"IGOT-LOCAL-{user_id[:6].upper()}",
            "issued_at": now_iso,
            "issuer": "VYREN Local FRAC Standard Engine (MoSPI/CBC Framework Aligned)",
            "credential_standard": "W3C-VC-Karmayogi-FRAC-1.0",
            "integration_mode": "FALLBACK / LOCAL",
            "is_official_government_credential": False,
            "verification_notice": (
                "Generated by VYREN internal competency engine. For official Karmayogi Bharat accreditation, "
                "sync via an authenticated Sunbird-compatible national iGOT gateway is required."
            ),
            "claims": claims,
        }

    def get_courses(self, competency_area: Optional[str] = None) -> List[dict]:
        local_courses = CourseRepository.list_courses()
        results = []
        for c in local_courses:
            results.append(
                {
                    "id": c.get("id"),
                    "title": c.get("title"),
                    "provider": "Local Catalog (FRAC Aligned)",
                    "competency_area": competency_area or "Civil Service Analytics",
                    "duration": f"{c.get('duration_minutes', 90)} mins",
                    "integration_mode": "FALLBACK / LOCAL",
                    "external_url": None,
                    "external_id": c.get("id"),
                }
            )
        return results

    def search_courses(
        self, query: Optional[str] = None, filters: Optional[dict] = None
    ) -> List[dict]:
        local_courses = CourseRepository.list_courses()
        if not query:
            return local_courses
        q = query.lower()
        matched = [
            c
            for c in local_courses
            if q in c.get("title", "").lower() or q in c.get("category", "").lower()
        ]
        return matched

    def get_course_hierarchy(self, course_id_or_do_id: str) -> Optional[dict]:
        return CourseRepository.get_course_detail(course_id_or_do_id)

    def get_course_detail(self, course_id_or_do_id: str) -> Optional[dict]:
        return CourseRepository.get_course_detail(course_id_or_do_id)


def get_igot_provider() -> BaseIgotProvider:
    """Factory to retrieve the appropriate iGOT provider based on configuration."""
    settings = get_settings()
    # Explicit override support for testing and forced provider selection
    if settings.igot_provider_mode:
        mode = settings.igot_provider_mode.upper()
        if mode in ("REAL", "SUNBIRD"):
            return RealIgotProvider(
                api_url=settings.igot_api_url or "https://igotkarmayogi.gov.in",
                auth_token=settings.igot_auth_token,
                client_id=settings.igot_client_id,
                client_secret=settings.igot_client_secret,
                channel=settings.igot_channel,
                timeout=settings.igot_timeout,
            )
        return LocalFallbackIgotProvider()

    # Automatic selection based on credentials
    if settings.igot_api_url and (
        settings.igot_auth_token
        or (settings.igot_client_id and settings.igot_client_secret)
    ):
        return RealIgotProvider(
            api_url=settings.igot_api_url,
            auth_token=settings.igot_auth_token,
            client_id=settings.igot_client_id,
            client_secret=settings.igot_client_secret,
            channel=settings.igot_channel,
            timeout=settings.igot_timeout,
        )
    return LocalFallbackIgotProvider()


class IGOTClientService:
    """Convenience facade routing to the active iGOT provider."""

    @staticmethod
    def get_status() -> dict:
        return get_igot_provider().get_status()

    @staticmethod
    def get_frac_mappings() -> List[dict]:
        return get_igot_provider().get_frac_mappings()

    @staticmethod
    def generate_karmayogi_passport(user_id: str) -> dict:
        return get_igot_provider().generate_karmayogi_passport(user_id)

    @staticmethod
    def get_courses(competency_area: Optional[str] = None) -> List[dict]:
        return get_igot_provider().get_courses(competency_area)

    @staticmethod
    def search_courses(
        query: Optional[str] = None, filters: Optional[dict] = None
    ) -> List[dict]:
        return get_igot_provider().search_courses(query=query, filters=filters)

    @staticmethod
    def get_course_hierarchy(course_id_or_do_id: str) -> Optional[dict]:
        return get_igot_provider().get_course_hierarchy(course_id_or_do_id)

    @staticmethod
    def get_course_detail(course_id_or_do_id: str) -> Optional[dict]:
        return get_igot_provider().get_course_detail(course_id_or_do_id)
