from unittest.mock import patch

from django.test import SimpleTestCase

from apps.commerce.services import indexnow


class IndexNowTests(SimpleTestCase):
    @patch.dict(
        "os.environ",
        {
            "INDEXNOW_KEY": "test-key-1234567890",
            "FRONTEND_URL": "https://kcova.example",
            "INDEXNOW_DISABLED": "",
        },
        clear=False,
    )
    @patch("apps.commerce.services.indexnow.requests.post")
    def test_notify_urls_posts_payload(self, mock_post):
        mock_post.return_value.status_code = 200
        mock_post.return_value.text = "ok"

        ok = indexnow.notify_urls([
            "https://kcova.example/store/demo",
            "https://other.example/ignore",
            "https://kcova.example/store/demo/dress",
        ])

        self.assertTrue(ok)
        mock_post.assert_called_once()
        _, kwargs = mock_post.call_args
        payload = kwargs["json"]
        self.assertEqual(payload["host"], "kcova.example")
        self.assertEqual(payload["key"], "test-key-1234567890")
        self.assertEqual(
            payload["keyLocation"],
            "https://kcova.example/indexnow-key.txt",
        )
        self.assertEqual(
            payload["urlList"],
            [
                "https://kcova.example/store/demo",
                "https://kcova.example/store/demo/dress",
            ],
        )

    @patch.dict("os.environ", {"INDEXNOW_KEY": ""}, clear=False)
    def test_disabled_without_key(self):
        self.assertFalse(indexnow.indexnow_enabled())
        self.assertFalse(indexnow.notify_urls(["https://kcova.example/store/x"]))
