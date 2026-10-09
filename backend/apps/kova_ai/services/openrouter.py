"""
OpenRouter service for Kova.

This module is the provider boundary between Kova and OpenRouter.

The rest of Kova must not construct OpenRouter HTTP requests directly.
This keeps provider-specific behavior isolated and allows the model
provider or model to change without rewriting Kova's intelligence layer.
"""

from __future__ import annotations

from typing import Any

import requests
from django.conf import settings
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry


class OpenRouterError(Exception):
    """Raised when communication with OpenRouter fails."""


class OpenRouterService:
    """Production OpenRouter client used by Kova."""

    BASE_URL = (
        "https://openrouter.ai/api/v1/chat/completions"
    )

    def __init__(
        self,
        *,
        api_key: str | None = None,
        model: str | None = None,
        timeout: int = 90,
    ) -> None:
        self.api_key = (
            api_key
            if api_key is not None
            else getattr(
                settings,
                "OPENROUTER_API_KEY",
                "",
            )
        )

        self.model = (
            model
            if model is not None
            else getattr(
                settings,
                "OPENROUTER_MODEL",
                "",
            )
        )

        self.timeout = timeout
        self.session = self._build_session()

    @staticmethod
    def _build_session() -> requests.Session:
        """
        Create an HTTP session with safe transient retry behavior.
        """

        retry = Retry(
            total=2,
            connect=2,
            read=2,
            status=2,
            backoff_factor=0.5,
            status_forcelist=(
                429,
                502,
                503,
                504,
            ),
            allowed_methods=frozenset(
                {"POST"}
            ),
            raise_on_status=False,
        )

        adapter = HTTPAdapter(
            max_retries=retry,
        )

        session = requests.Session()

        session.mount(
            "https://",
            adapter,
        )

        return session

    def chat(
        self,
        *,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]] | None = None,
        tool_choice: (
            str
            | dict[str, Any]
            | None
        ) = None,
        parallel_tool_calls: bool = False,
        temperature: float = 0.2,
        max_tokens: int = 4096,
        response_format: (
            dict[str, Any]
            | None
        ) = None,
        plugins: list[dict[str, Any]] | None = None,
        reasoning: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """
        Send a chat completion request to OpenRouter.

        Tool definitions are passed through unchanged using the
        OpenAI-compatible tool-calling contract supported by OpenRouter.

        Args:
            messages: Conversation messages.
            tools: Available Kova tools.
            tool_choice: Model tool-selection policy.
            parallel_tool_calls: Whether the model may request multiple
                tools in one turn.
            temperature: Model sampling temperature.
            max_tokens: Maximum generated tokens.
            response_format: Optional structured-output configuration.
            plugins: Optional OpenRouter plugins, including web search.

        Returns:
            Parsed OpenRouter response.

        Raises:
            OpenRouterError:
                If configuration, networking, or provider response
                validation fails.
        """

        if not self.api_key:
            raise OpenRouterError(
                "OPENROUTER_API_KEY is not configured."
            )

        if not self.model:
            raise OpenRouterError(
                "OPENROUTER_MODEL is not configured."
            )

        if not messages:
            raise OpenRouterError(
                "At least one message is required."
            )

        payload: dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "parallel_tool_calls": (
                parallel_tool_calls
            ),
        }

        if tools:
            payload["tools"] = tools

        if tool_choice is not None:
            payload["tool_choice"] = tool_choice

        if response_format is not None:
            payload["response_format"] = (
                response_format
            )

        if plugins:
            payload["plugins"] = plugins

        if reasoning:
            payload["reasoning"] = reasoning

        headers = {
            "Authorization": (
                f"Bearer {self.api_key}"
            ),
            "Content-Type": "application/json",
        }

        site_url = getattr(
            settings,
            "OPENROUTER_SITE_URL",
            "",
        )

        app_name = getattr(
            settings,
            "OPENROUTER_APP_NAME",
            "Kova",
        )

        if site_url:
            headers["HTTP-Referer"] = site_url

        if app_name:
            headers["X-Title"] = app_name

        try:
            response = self.session.post(
                self.BASE_URL,
                headers=headers,
                json=payload,
                timeout=self.timeout,
            )

        except requests.RequestException as exc:
            raise OpenRouterError(
                f"Unable to reach OpenRouter: {exc}"
            ) from exc

        if not response.ok:
            detail = self._extract_error_detail(
                response
            )

            raise OpenRouterError(
                "OpenRouter request failed "
                f"with status {response.status_code}: "
                f"{detail}"
            )

        try:
            data = response.json()

        except ValueError as exc:
            raise OpenRouterError(
                "OpenRouter returned invalid JSON."
            ) from exc

        if not isinstance(data, dict):
            raise OpenRouterError(
                "OpenRouter returned an invalid response object."
            )

        return data

    @staticmethod
    def _extract_error_detail(
        response: requests.Response,
    ) -> str:
        """
        Extract a useful provider error without exposing an enormous
        response body.
        """

        try:
            data = response.json()

            if isinstance(data, dict):
                error = data.get("error")

                if isinstance(error, dict):
                    message = error.get(
                        "message"
                    )

                    if message:
                        return str(message)

                if isinstance(error, str):
                    return error

        except ValueError:
            pass

        text = (
            response.text or ""
        ).strip()

        if not text:
            return "No error details returned."

        return text[:1000]