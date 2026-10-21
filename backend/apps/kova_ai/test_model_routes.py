from django.test import SimpleTestCase, TestCase, override_settings

from apps.kova_ai.models import AiModelRoute
from apps.kova_ai.services.model_routes import (
    clear_route_cache,
    default_model_for_task,
    ensure_default_routes,
    resolve_model_for_task,
)
from apps.kova_ai.services.openrouter import OpenRouterService


class ModelRouteCatalogTests(SimpleTestCase):
    def test_cheap_defaults_for_high_volume_tasks(self):
        self.assertEqual(
            default_model_for_task("inbox"),
            "google/gemini-2.5-flash-lite",
        )
        self.assertEqual(
            default_model_for_task("broadcast_pack"),
            "google/gemini-2.5-flash-lite",
        )

    def test_vision_and_agent_use_flash_lite_default(self):
        self.assertEqual(
            default_model_for_task("product_vision"),
            "google/gemini-3.1-flash-lite",
        )
        self.assertEqual(
            default_model_for_task("ask_kova"),
            "google/gemini-3.1-flash-lite",
        )

    def test_snap_alias_maps_to_product_vision(self):
        self.assertEqual(
            default_model_for_task("snap_to_sell"),
            default_model_for_task("product_vision"),
        )


@override_settings(OPENROUTER_MODEL="google/gemini-3.8-flash")
class ModelRouteResolutionTests(TestCase):
    def setUp(self):
        clear_route_cache()
        AiModelRoute.objects.all().delete()
        clear_route_cache()

    def tearDown(self):
        clear_route_cache()

    def test_catalog_default_when_no_row(self):
        self.assertEqual(
            resolve_model_for_task("inbox"),
            "google/gemini-2.5-flash-lite",
        )

    def test_db_route_overrides_catalog(self):
        AiModelRoute.objects.create(
            task_key="inbox",
            model_id="google/gemini-3.8-flash",
        )
        clear_route_cache()
        self.assertEqual(
            resolve_model_for_task("inbox"),
            "google/gemini-3.8-flash",
        )

    def test_ensure_default_routes_seeds_all_tasks(self):
        created = ensure_default_routes()
        self.assertGreater(created, 0)
        self.assertEqual(ensure_default_routes(), 0)
        self.assertTrue(
            AiModelRoute.objects.filter(task_key="product_vision").exists()
        )

    def test_openrouter_uses_route_for_feature(self):
        AiModelRoute.objects.create(
            task_key="draft",
            model_id="google/gemini-2.5-flash-lite",
        )
        clear_route_cache()
        service = OpenRouterService(api_key="sk-test")
        resolved = service._resolve_model(feature="draft", model=None)
        self.assertEqual(resolved, "google/gemini-2.5-flash-lite")

    def test_explicit_constructor_model_wins(self):
        AiModelRoute.objects.create(
            task_key="draft",
            model_id="google/gemini-2.5-flash-lite",
        )
        clear_route_cache()
        service = OpenRouterService(
            api_key="sk-test",
            model="google/gemini-3.8-flash",
        )
        resolved = service._resolve_model(feature="draft", model=None)
        self.assertEqual(resolved, "google/gemini-3.8-flash")
