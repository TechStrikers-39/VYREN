import os
import sys
import unittest
import uuid
from unittest.mock import MagicMock, patch
import httpx

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from app.core.config import Settings
from app.services.competency_mapper import CompetencyMapperService, VYREN_CORE_COMPETENCIES
from app.services.igot_client import (
    BaseIgotProvider,
    RealIgotProvider,
    LocalFallbackIgotProvider,
    get_igot_provider,
    parse_duration_to_minutes,
    IGOTClientService,
)
from app.repositories.course_repo import CourseRepository


MOCK_SUNBIRD_SEARCH_RESPONSE = {
    "id": "api.content.search",
    "ver": "1.0",
    "ts": "2026-09-13T10:00:00.000Z",
    "responseCode": "OK",
    "result": {
        "count": 2,
        "content": [
            {
                "identifier": "do_113840294924828672111",
                "name": "Official Statistics & National Accounts Framework",
                "description": "Comprehensive course on National Accounts, GVA calculation, and MoSPI survey sampling methods.",
                "organisation": ["National Statistical Systems Training Academy (NSSTA)"],
                "duration": "9000",
                "competencies_v5": [{"competencyName": "Statistical Inference & Sampling"}],
                "primaryCategory": "Course",
                "status": "Live",
                "leafNodesCount": 2,
            },
            {
                "identifier": "do_113524958193852416124",
                "name": "Data Engineering for Civil Services: Pipelines & ETL",
                "description": "Production data ingestion, Kafka streaming, and database pipeline design for public administration.",
                "organisation": ["NIC - National Informatics Centre"],
                "duration": "7200",
                "competencies_v5": [{"competencyName": "Data Pipeline Design"}],
                "primaryCategory": "Course",
                "status": "Live",
                "leafNodesCount": 2,
            },
        ],
    },
}

MOCK_SUNBIRD_HIERARCHY_RESPONSE = {
    "id": "api.course.hierarchy",
    "ver": "1.0",
    "responseCode": "OK",
    "result": {
        "content": {
            "identifier": "do_113840294924828672111",
            "name": "Official Statistics & National Accounts Framework",
            "description": "Comprehensive course on National Accounts, GVA calculation, and MoSPI survey sampling methods.",
            "organisation": ["National Statistical Systems Training Academy (NSSTA)"],
            "duration": "9000",
            "primaryCategory": "Course",
            "children": [
                {
                    "identifier": "do_unit_01",
                    "name": "Unit 1: Evolution of National Accounts & GVA",
                    "contentType": "CourseUnit",
                    "description": "Covers foundational GDP and GVA estimation models under SNA.",
                    "duration": "3600",
                },
                {
                    "identifier": "do_unit_02",
                    "name": "Unit 2: Sampling and Survey Error Mitigation",
                    "contentType": "CourseUnit",
                    "description": "Methodology for survey stratification and bias control in national sample surveys.",
                    "duration": "5400",
                },
            ],
        }
    },
}


class TestSunbirdIgotIntegration(unittest.TestCase):

    def setUp(self):
        self.real_provider = RealIgotProvider(
            api_url="https://mock-igot.gov.in",
            auth_token="test-bearer-token-xyz",
            channel="igot",
            timeout=5.0,
        )
        self.fallback_provider = LocalFallbackIgotProvider()

    # -------------------------------------------------------------------------
    # TEST 1: Sunbird response normalization
    # -------------------------------------------------------------------------
    def test_01_sunbird_response_normalization(self):
        raw_item = MOCK_SUNBIRD_SEARCH_RESPONSE["result"]["content"][0]
        normalized = self.real_provider._normalize_content_item(raw_item)

        self.assertEqual(normalized["external_id"], "do_113840294924828672111")
        self.assertEqual(normalized["title"], "Official Statistics & National Accounts Framework")
        self.assertEqual(normalized["provider"], "National Statistical Systems Training Academy (NSSTA)")
        self.assertEqual(normalized["duration_minutes"], 150)  # 9000s -> 150 mins
        self.assertEqual(normalized["integration_mode"], "REAL / SUNBIRD")
        self.assertIn("c1000000-0000-0000-0000-000000000001", normalized["competencies_covered"])
        self.assertEqual(
            normalized["external_url"],
            "https://igotkarmayogi.gov.in/app/toc/do_113840294924828672111/overview",
        )

    # -------------------------------------------------------------------------
    # TEST 2: Course search via Sunbird POST /api/content/v1/search
    # -------------------------------------------------------------------------
    @patch("httpx.Client.post")
    def test_02_course_search_sunbird_api(self, mock_post):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = MOCK_SUNBIRD_SEARCH_RESPONSE
        mock_post.return_value = mock_resp

        results = self.real_provider.search_courses(query="Statistics")
        self.assertEqual(len(results), 2)
        self.assertEqual(results[0]["external_id"], "do_113840294924828672111")
        self.assertEqual(results[1]["external_id"], "do_113524958193852416124")

        # Verify POST was called with Sunbird envelope
        call_args, call_kwargs = mock_post.call_args
        self.assertTrue(call_args[0].endswith("/api/content/v1/search"))
        self.assertIn("request", call_kwargs["json"])
        self.assertEqual(call_kwargs["json"]["request"]["query"], "Statistics")
        self.assertEqual(call_kwargs["headers"]["X-Channel-Id"], "igot")
        self.assertEqual(call_kwargs["headers"]["Authorization"], "Bearer test-bearer-token-xyz")

    # -------------------------------------------------------------------------
    # TEST 3: Course hierarchy parsing (tree traversal to modules)
    # -------------------------------------------------------------------------
    @patch("httpx.Client.get")
    def test_03_course_hierarchy_parsing(self, mock_get):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = MOCK_SUNBIRD_HIERARCHY_RESPONSE
        mock_get.return_value = mock_resp

        course = self.real_provider.get_course_hierarchy("do_113840294924828672111")
        self.assertIsNotNone(course)
        self.assertEqual(len(course["modules"]), 2)

        m1 = course["modules"][0]
        self.assertEqual(m1["title"], "Unit 1: Evolution of National Accounts & GVA")
        self.assertEqual(m1["duration_minutes"], 60)  # 3600s -> 60 mins
        self.assertEqual(m1["order_index"], 0)
        self.assertEqual(m1["external_id"], "do_unit_01")

        m2 = course["modules"][1]
        self.assertEqual(m2["title"], "Unit 2: Sampling and Survey Error Mitigation")
        self.assertEqual(m2["duration_minutes"], 90)  # 5400s -> 90 mins
        self.assertEqual(m2["order_index"], 1)

    # -------------------------------------------------------------------------
    # TEST 4: External DO_ID preservation and deterministic UUIDv5 generation
    # -------------------------------------------------------------------------
    def test_04_do_id_preservation_and_deterministic_uuid(self):
        do_id = "do_113840294924828672111"
        expected_uuid = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"igot:{do_id}"))

        raw_item = {"identifier": do_id, "name": "Official Statistics", "duration": 3600}
        norm1 = self.real_provider._normalize_content_item(raw_item)
        norm2 = self.real_provider._normalize_content_item(raw_item)

        # External DO_ID is preserved exactly
        self.assertEqual(norm1["external_id"], do_id)
        # Deterministic UUID is reproducible and identical every run
        self.assertEqual(norm1["id"], expected_uuid)
        self.assertEqual(norm1["id"], norm2["id"])

    # -------------------------------------------------------------------------
    # TEST 5: Idempotent course ingestion / duplicate prevention
    # -------------------------------------------------------------------------
    @patch("app.repositories.course_repo.get_supabase")
    def test_05_idempotent_course_ingestion(self, mock_get_sb):
        mock_sb = MagicMock()
        mock_table = MagicMock()
        mock_sb.table.return_value = mock_table
        mock_table.upsert.return_value = mock_table
        mock_table.execute.return_value = MagicMock(data=[{"id": "b0200000-0000-0000-0000-000000000001"}])
        mock_get_sb.return_value = mock_sb

        test_course = {
            "id": "b0200000-0000-0000-0000-000000000001",
            "title": "Official Statistics",
            "description": "Test",
            "modules": [
                {"id": "d0200000-0000-0000-0000-000000000001", "title": "M1", "duration_minutes": 30}
            ],
        }

        # First ingestion
        res1 = CourseRepository.upsert_normalized_course(test_course)
        # Second identical ingestion (must not fail or create duplicate)
        res2 = CourseRepository.upsert_normalized_course(test_course)

        self.assertEqual(res1["id"], res2["id"])
        # Verify on_conflict='id' was explicitly used for both courses and course_modules
        upsert_calls = mock_table.upsert.call_args_list
        for call in upsert_calls:
            self.assertEqual(call.kwargs.get("on_conflict"), "id")

    # -------------------------------------------------------------------------
    # TEST 6: Competency mapping service
    # -------------------------------------------------------------------------
    def test_06_competency_mapping_service(self):
        # 1. Statistical mapping
        stat_maps = CompetencyMapperService.map_course_to_competencies(
            title="Sample Survey Design & Error Minimization",
            description="Statistical sampling methodology for official NSSO surveys.",
        )
        self.assertTrue(len(stat_maps) > 0)
        self.assertEqual(stat_maps[0]["competency_id"], "c1000000-0000-0000-0000-000000000001")
        self.assertEqual(stat_maps[0]["frac_code"], "FRAC-DA-STAT-01")

        # 2. Pipeline mapping
        pipe_maps = CompetencyMapperService.map_course_to_competencies(
            title="Enterprise ETL & Streaming Pipelines",
            description="Kafka and Spark infrastructure for national databases.",
        )
        self.assertEqual(pipe_maps[0]["competency_id"], "c1000000-0000-0000-0000-000000000002")
        self.assertEqual(pipe_maps[0]["frac_code"], "FRAC-DE-PIPE-02")

        # 3. MLOps mapping
        ml_maps = CompetencyMapperService.map_course_to_competencies(
            title="Machine Learning Ops: Telemetry & Model Drift",
            description="Automated retraining workflows and concept drift detection.",
        )
        self.assertEqual(ml_maps[0]["competency_id"], "c1000000-0000-0000-0000-000000000003")
        self.assertEqual(ml_maps[0]["frac_code"], "FRAC-AI-MLOPS-03")

        # 4. Governance mapping
        gov_maps = CompetencyMapperService.map_course_to_competencies(
            title="Data Governance, Privacy and DPDP Compliance",
            description="Audit procedures, cataloguing, and data lineage enforcement.",
        )
        self.assertEqual(gov_maps[0]["competency_id"], "c1000000-0000-0000-0000-000000000004")
        self.assertEqual(gov_maps[0]["frac_code"], "FRAC-DM-GOV-04")

        # 5. Unmapped content (does not hallucinate)
        unmapped = CompetencyMapperService.map_course_to_competencies(
            title="Creative Pottery and Sculpture",
            description="Techniques for molding clay and pottery kiln firing.",
        )
        self.assertEqual(len(unmapped), 0)

    # -------------------------------------------------------------------------
    # TEST 7: Recommendation -> Course linking
    # -------------------------------------------------------------------------
    @patch("app.repositories.course_repo.get_supabase")
    def test_07_recommendation_to_course_link(self, mock_get_sb):
        mock_sb = MagicMock()
        mock_table = MagicMock()
        mock_sb.table.return_value = mock_table
        mock_table.select.return_value = mock_table
        mock_table.contains.return_value = mock_table
        mock_table.eq.return_value = mock_table
        mock_table.limit.return_value = mock_table
        mock_table.execute.return_value = MagicMock(
            data=[
                {
                    "id": "b0200000-0000-0000-0000-000000000001",
                    "title": "Official Statistics and National Accounts",
                    "competencies_covered": ["c1000000-0000-0000-0000-000000000001"],
                }
            ]
        )
        mock_get_sb.return_value = mock_sb

        found_course = CourseRepository.get_course_for_competency("c1000000-0000-0000-0000-000000000001")
        self.assertIsNotNone(found_course)
        self.assertEqual(found_course["id"], "b0200000-0000-0000-0000-000000000001")
        self.assertIn("c1000000-0000-0000-0000-000000000001", found_course["competencies_covered"])

    # -------------------------------------------------------------------------
    # TEST 8: Missing credentials handling (honestly reports fallback)
    # -------------------------------------------------------------------------
    def test_08_missing_credentials_status(self):
        status = self.fallback_provider.get_status()
        self.assertEqual(status["mode"], "FALLBACK / LOCAL")
        self.assertFalse(status["is_real"])
        self.assertFalse(status["authenticated"])
        self.assertIn("Official Sunbird-compatible iGOT Karmayogi credentials not configured", status["blocker_summary"])
        self.assertIn("POST /api/content/v1/search", status["blocker_details"])

    # -------------------------------------------------------------------------
    # TEST 9: HTTP 401/403 Handling
    # -------------------------------------------------------------------------
    @patch("httpx.Client.post")
    def test_09_http_401_403_handling(self, mock_post):
        mock_resp = MagicMock()
        mock_resp.status_code = 401
        mock_resp.text = "Unauthorized: Invalid or expired Bearer token"
        mock_post.return_value = mock_resp

        # Must not throw uncaught exception; should log and return empty list
        results = self.real_provider.search_courses(query="Statistics")
        self.assertEqual(results, [])

    # -------------------------------------------------------------------------
    # TEST 10: Network timeout handling
    # -------------------------------------------------------------------------
    @patch("httpx.Client.post")
    def test_10_network_timeout_handling(self, mock_post):
        mock_post.side_effect = httpx.TimeoutException("Connection timed out after 5.0s")

        # Must not crash; should handle timeout safely
        results = self.real_provider.search_courses(query="Statistics")
        self.assertEqual(results, [])

    # -------------------------------------------------------------------------
    # TEST 11: Malformed API response handling
    # -------------------------------------------------------------------------
    @patch("httpx.Client.post")
    def test_11_malformed_api_response_handling(self, mock_post):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {"error": "Malformed root object", "result": None}
        mock_post.return_value = mock_resp

        results = self.real_provider.search_courses(query="Statistics")
        self.assertEqual(results, [])

    # -------------------------------------------------------------------------
    # TEST 12: Fallback provider behavior
    # -------------------------------------------------------------------------
    @patch("app.repositories.course_repo.CourseRepository.list_courses")
    def test_12_fallback_provider_behavior(self, mock_list):
        mock_list.return_value = [
            {
                "id": "b0100000-0000-0000-0000-000000000001",
                "title": "Data Pipeline Design: Enterprise Patterns",
                "duration_minutes": 90,
                "category": "Data Engineering",
            }
        ]

        courses = self.fallback_provider.get_courses()
        self.assertEqual(len(courses), 1)
        c = courses[0]
        self.assertEqual(c["integration_mode"], "FALLBACK / LOCAL")
        self.assertEqual(c["provider"], "Local Catalog (FRAC Aligned)")
        self.assertIsNone(c["external_url"])

    # -------------------------------------------------------------------------
    # TEST 13: Provider selection logic
    # -------------------------------------------------------------------------
    @patch("app.services.igot_client.get_settings")
    def test_13_provider_selection_logic(self, mock_settings):
        # Case A: Explicit forced REAL mode
        mock_settings.return_value = Settings(
            supabase_url="https://mock.supabase.co",
            supabase_anon_key="anon",
            supabase_service_role_key="service",
            supabase_jwt_secret="secret",
            igot_provider_mode="REAL",
            igot_api_url="https://custom-sunbird.gov.in",
        )
        provider_real = get_igot_provider()
        self.assertIsInstance(provider_real, RealIgotProvider)

        # Case B: Explicit forced FALLBACK mode
        mock_settings.return_value = Settings(
            supabase_url="https://mock.supabase.co",
            supabase_anon_key="anon",
            supabase_service_role_key="service",
            supabase_jwt_secret="secret",
            igot_provider_mode="FALLBACK",
            igot_api_url="https://custom-sunbird.gov.in",
            igot_auth_token="has_token",
        )
        provider_fb = get_igot_provider()
        self.assertIsInstance(provider_fb, LocalFallbackIgotProvider)

        # Case C: Automatic detection without credentials -> FALLBACK
        mock_settings.return_value = Settings(
            supabase_url="https://mock.supabase.co",
            supabase_anon_key="anon",
            supabase_service_role_key="service",
            supabase_jwt_secret="secret",
            igot_provider_mode=None,
            igot_api_url=None,
            igot_auth_token=None,
        )
        provider_auto_fb = get_igot_provider()
        self.assertIsInstance(provider_auto_fb, LocalFallbackIgotProvider)

        # Case D: Automatic detection with credentials -> REAL
        mock_settings.return_value = Settings(
            supabase_url="https://mock.supabase.co",
            supabase_anon_key="anon",
            supabase_service_role_key="service",
            supabase_jwt_secret="secret",
            igot_provider_mode=None,
            igot_api_url="https://api.igotkarmayogi.gov.in",
            igot_auth_token="live-bearer-token-999",
        )
        provider_auto_real = get_igot_provider()
        self.assertIsInstance(provider_auto_real, RealIgotProvider)



if __name__ == "__main__":
    unittest.main(verbosity=2)
