"""
Kova product vision service.

This service sends product images and owner-provided facts to Kova's
multimodal AI layer through the centralized OpenRouter service.

Important:
- Owner facts are authoritative.
- AI may infer visual characteristics.
- AI must not invent commercial facts.
- Unknown attributes remain unknown.
"""

from __future__ import annotations

import base64
import json
import logging
import re
from typing import Any

from apps.kova_ai.services.openrouter import (
    OpenRouterError,
    OpenRouterService,
)


logger = logging.getLogger(__name__)


class ProductVisionError(Exception):
    """Raised when Kova cannot obtain valid product intelligence."""


class ProductVisionService:
    """
    Analyze product images using Kova's multimodal AI layer.

    This service is intentionally independent of Django models so it can
    later be reused by batch snapping, WhatsApp commerce, receipt scanning,
    and other commerce workflows.
    """

    def __init__(self, *, model: str | None = None) -> None:
        self.provider = OpenRouterService(model=model)

    def analyze(
        self,
        images: list[tuple[str, bytes]],
        owner_facts: dict[str, Any],
        business_context: dict[str, Any],
    ) -> dict[str, Any]:
        """
        Analyze product images and return normalized product intelligence.
        """

        if not images:
            raise ProductVisionError(
                "At least one product image is required."
            )

        messages = [
            {
                "role": "system",
                "content": self._system_prompt(),
            },
            {
                "role": "user",
                "content": self._build_user_content(
                    images=images,
                    owner_facts=owner_facts,
                    business_context=business_context,
                ),
            },
        ]

        try:
            payload = self._complete(messages, max_tokens=4000)
            result = self._read_result(payload)
        except OpenRouterError as exc:
            raise ProductVisionError(str(exc)) from exc
        except (
            ValueError,
            TypeError,
            KeyError,
            json.JSONDecodeError,
        ) as first_error:
            logger.warning(
                "Product analysis JSON could not be read (%s). Retrying. %s",
                first_error,
                self._response_hint(payload),
            )
            try:
                payload = self._complete(messages, max_tokens=6000)
                result = self._read_result(payload)
            except OpenRouterError as exc:
                raise ProductVisionError(str(exc)) from exc
            except (
                ValueError,
                TypeError,
                KeyError,
                json.JSONDecodeError,
            ) as exc:
                logger.warning(
                    "Product analysis JSON failed again. %s",
                    self._response_hint(payload),
                )
                raise ProductVisionError(
                    "Kova received an invalid product analysis response."
                ) from exc

        return self._normalize_result(result)

    def polish(
        self,
        images: list[tuple[str, bytes]],
        listing: dict[str, Any],
        business_context: dict[str, Any],
    ) -> dict[str, Any]:
        """
        Rewrite a product listing for the public store page.

        The vision model sees the product photos. The same model writes
        the visitor-facing copy from what it can see and the facts already
        saved on the product.
        """

        messages = [
            {
                "role": "system",
                "content": self._polish_prompt(),
            },
            {
                "role": "user",
                "content": self._polish_user_content(
                    images=images,
                    listing=listing,
                    business_context=business_context,
                ),
            },
        ]

        try:
            payload = self._complete(messages, max_tokens=4000, temperature=0.4)
            result = self._read_result(payload)
        except OpenRouterError as exc:
            raise ProductVisionError(str(exc)) from exc
        except (
            ValueError,
            TypeError,
            KeyError,
            json.JSONDecodeError,
        ) as exc:
            raise ProductVisionError(
                "Kova received an invalid product polish response."
            ) from exc

        polished = self._normalize_result(result)
        polished["alt_text"] = str(result.get("alt_text") or "").strip()[:300]
        polished["material"] = str(result.get("material") or "").strip()[:160]
        return polished

    def _polish_prompt(self) -> str:
        return """
You polish a product listing for a public shop page.

Look at the product photos, then improve the words a visitor reads.

RULES:
1. Price, currency, stock, SKU, brand, size, and condition are owner facts. Never change them and do not repeat invented versions of them.
2. Keep a name that is already specific and complete. Rewrite it only when it is generic, cut off, or less accurate than the photo.
3. Fill category with a specific type a shopper would search for, such as Sectional sofas.
4. Fill color from the colors you can see. If the owner already set a color, keep that color.
5. Fill material only when the photo or the owner facts make it clear. Otherwise leave material empty.
6. Write short_description as one or two sentences a visitor reads first.
7. Write description as two short paragraphs. Be concrete. Describe shape, color, and use.
8. Do not claim premium, luxury, original, certified, waterproof, or a warranty unless the supplied facts say so.
9. Do not invent measurements, ingredients, or specifications.
10. selling_points: 3 to 5 short points grounded in the photo or the supplied facts.
11. seo_title under 70 characters. seo_description under 160 characters.
12. alt_text: one sentence describing the main photo for someone who cannot see it.
13. Write clear English for a shopper in Kenya.
14. Return one JSON object only. No markdown.

Return exactly this structure:

{
  "name": "",
  "category": "",
  "color": "",
  "material": "",
  "short_description": "",
  "description": "",
  "seo_title": "",
  "seo_description": "",
  "selling_points": [],
  "keywords": [],
  "visual_attributes": {},
  "uncertain_attributes": [],
  "ai_summary": "what you improved for the public page",
  "alt_text": "",
  "confidence": 0.0
}
"""

    def _polish_user_content(
        self,
        images: list[tuple[str, bytes]],
        listing: dict[str, Any],
        business_context: dict[str, Any],
    ) -> list[dict[str, Any]] | str:
        text = (
            "Polish this product for the public store page.\n\n"
            "CURRENT LISTING:\n"
            f"{json.dumps(listing, ensure_ascii=False)}\n\n"
            "BUSINESS CONTEXT:\n"
            f"{json.dumps(business_context, ensure_ascii=False)}\n\n"
            "Use the photos to make the listing specific. "
            "Leave commercial facts as they are."
        )
        if not images:
            return text

        content: list[dict[str, Any]] = [{"type": "text", "text": text}]
        for filename, image_bytes in images:
            if not image_bytes:
                continue
            encoded = base64.b64encode(image_bytes).decode("utf-8")
            content.append(
                {
                    "type": "image_url",
                    "image_url": {
                        "url": (
                            f"data:{self._guess_mime_type(filename)};"
                            f"base64,{encoded}"
                        )
                    },
                }
            )
        return content if len(content) > 1 else text

    def _system_prompt(self) -> str:
        """Return the strict product-understanding instructions."""

        return """
You are Kova's product intelligence engine.

Your job is to understand a product from its image and the facts supplied
by the business owner.

CRITICAL RULES:

1. Owner-provided facts are authoritative.
2. Never change, reinterpret, or invent price, stock, SKU, size, material,
   brand, condition, or other commercial facts supplied by the owner.
3. Only infer attributes that are reasonably visible in the image.
4. If an attribute cannot be established confidently, leave it unknown.
5. Never invent certifications, technical specifications, performance claims,
   measurements, ingredients, materials, or product guarantees.
6. Do not claim a product is genuine, original, medical-grade, waterproof,
   premium, certified, or similar unless the supplied facts support it.
7. Marketing language must remain grounded in observable or supplied facts.
8. Return a single JSON object only.
9. Do not wrap the JSON in markdown.
10. Do not include explanations outside the JSON object.
11. Keep every string on one line. Do not put line breaks or quotation marks inside a value.

Return exactly this structure:

{
  "name": "short useful product name",
  "category": "specific product type a shopper would search for",
  "color": "visible colors, such as Grey and teal",
  "short_description": "one sentence",
  "description": "clear product description",
  "seo_title": "SEO title",
  "seo_description": "SEO description",
  "selling_points": [],
  "keywords": [],
  "visual_attributes": {},
  "uncertain_attributes": [],
  "ai_summary": "short explanation of what Kova understood",
  "confidence": 0.0
}

Confidence must be between 0 and 1.

Always fill category when the product type is visible. Use a specific type such as Sofas, Dresses, or Watches.
Always fill color with the colors you can see. If several colors are visible, name the main ones in one short phrase.
Also put those colors in visual_attributes.color.
"""

    def _build_user_content(
        self,
        images: list[tuple[str, bytes]],
        owner_facts: dict[str, Any],
        business_context: dict[str, Any],
    ) -> list[dict[str, Any]]:
        """
        Build the multimodal OpenRouter message content.

        The image is sent as a base64 data URL because OpenRouter supports
        OpenAI-compatible multimodal message content.
        """

        content: list[dict[str, Any]] = [
            {
                "type": "text",
                "text": (
                    "Analyze this product for a small business.\n\n"
                    "OWNER-PROVIDED FACTS:\n"
                    f"{json.dumps(owner_facts, ensure_ascii=False)}\n\n"
                    "BUSINESS CONTEXT:\n"
                    f"{json.dumps(business_context, ensure_ascii=False)}\n\n"
                    "Use the images together with these facts. "
                    "Do not invent unsupported facts."
                ),
            }
        ]

        for filename, image_bytes in images:
            if not image_bytes:
                continue

            encoded = base64.b64encode(
                image_bytes
            ).decode("utf-8")

            mime_type = self._guess_mime_type(
                filename
            )

            content.append(
                {
                    "type": "image_url",
                    "image_url": {
                        "url": (
                            f"data:{mime_type};base64,{encoded}"
                        )
                    },
                }
            )

        if len(content) == 1:
            raise ProductVisionError(
                "The supplied product images are empty."
            )

        return content

    def _extract_content(
        self,
        payload: Any,
    ) -> str:
        """
        Extract model-generated text from an OpenRouter response.

        Different OpenAI-compatible models can return content as:
        - string
        - list of content objects
        - tuple/list test doubles
        - dictionary-shaped content
        """

        if not isinstance(payload, dict):
            raise ValueError(
                "OpenRouter response must be an object."
            )

        choices = payload.get("choices")

        if not choices:
            raise ValueError(
                "OpenRouter response contains no choices."
            )

        if not isinstance(choices, (list, tuple)):
            raise ValueError(
                "OpenRouter choices must be a list."
            )

        first_choice = choices[0]

        if not isinstance(first_choice, dict):
            raise ValueError(
                "OpenRouter choice is invalid."
            )

        message = first_choice.get(
            "message",
            {},
        )

        if not isinstance(message, dict):
            raise ValueError(
                "OpenRouter message is invalid."
            )

        content = message.get("content")

        return self._content_to_text(content)

    def _content_to_text(
        self,
        content: Any,
    ) -> str:
        """
        Normalize the different content shapes that models/mocks may return.
        """

        if isinstance(content, str):
            return content

        if isinstance(content, bytes):
            return content.decode(
                "utf-8",
                errors="replace",
            )

        if isinstance(content, dict):
            # Some providers may return a direct text object.
            text = content.get("text")

            if isinstance(text, str):
                return text

            # Some structured responses may put JSON directly in a field.
            if "content" in content:
                return self._content_to_text(
                    content["content"]
                )

            if "value" in content:
                return self._content_to_text(
                    content["value"]
                )

            raise ValueError(
                "Model content dictionary contains no text."
            )

        if isinstance(content, (list, tuple)):
            text_parts: list[str] = []

            for item in content:
                try:
                    text_parts.append(
                        self._content_to_text(item)
                    )
                except ValueError:
                    continue

            combined = "".join(
                part
                for part in text_parts
                if part
            ).strip()

            if combined:
                return combined

            raise ValueError(
                "Model content contains no usable text."
            )

        raise ValueError(
            f"Unsupported model content type: "
            f"{type(content).__name__}"
        )

    def _complete(
        self,
        messages: list[dict[str, Any]],
        *,
        max_tokens: int,
        temperature: float = 0.2,
    ) -> dict[str, Any]:
        """Ask the vision model for JSON, with little hidden reasoning."""

        return self.provider.chat(
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            response_format={"type": "json_object"},
            reasoning={"effort": "low"},
        )

    def _read_result(self, payload: dict[str, Any]) -> dict[str, Any]:
        return self._parse_json(self._extract_content(payload))

    @staticmethod
    def _response_hint(payload: Any) -> str:
        if not isinstance(payload, dict):
            return "No response body."
        choice = (payload.get("choices") or [{}])[0]
        if not isinstance(choice, dict):
            return "No choice."
        finish = choice.get("finish_reason") or ""
        message = choice.get("message") if isinstance(choice.get("message"), dict) else {}
        content = message.get("content")
        text = content if isinstance(content, str) else ""
        return f"finish={finish} chars={len(text)} sample={text[:180]!r}"

    @staticmethod
    def _loads_object(text: str) -> dict[str, Any] | json.JSONDecodeError:
        try:
            result = json.loads(text)
        except json.JSONDecodeError as exc:
            start = text.find("{")
            end = text.rfind("}")
            if start == -1 or end <= start:
                return exc
            try:
                result = json.loads(text[start : end + 1])
            except json.JSONDecodeError as inner:
                return inner
        if isinstance(result, dict):
            return result
        return json.JSONDecodeError("Product analysis must be an object.", text, 0)

    @classmethod
    def _repair_json(cls, text: str) -> str:
        """
        Turn a cut-off or loosely formatted model object into JSON.

        Vision models sometimes break a string across lines, or stop
        before the closing braces.
        """

        repaired: list[str] = []
        in_string = False
        escape = False
        for char in text:
            if in_string:
                if escape:
                    repaired.append(char)
                    escape = False
                    continue
                if char == "\\":
                    repaired.append(char)
                    escape = True
                    continue
                if char == '"':
                    in_string = False
                    repaired.append(char)
                    continue
                if char == "\n":
                    repaired.append("\\n")
                    continue
                if char == "\r":
                    continue
                if char == "\t":
                    repaired.append("\\t")
                    continue
                repaired.append(char)
                continue
            if char == '"':
                in_string = True
            repaired.append(char)

        if in_string:
            repaired.append('"')

        body = "".join(repaired).strip()
        body = re.sub(r",\s*([}\]])", r"\1", body)
        body = re.sub(r"[,:]\s*$", "", body)

        stack: list[str] = []
        in_string = False
        escape = False
        for char in body:
            if in_string:
                if escape:
                    escape = False
                elif char == "\\":
                    escape = True
                elif char == '"':
                    in_string = False
                continue
            if char == '"':
                in_string = True
            elif char == "{":
                stack.append("}")
            elif char == "[":
                stack.append("]")
            elif char in "}]" and stack and stack[-1] == char:
                stack.pop()

        if stack:
            body += "".join(reversed(stack))
        return body

    @classmethod
    def _repair_loose(cls, text: str) -> str:
        """Escape quotation marks that sit inside a value, then close the object."""

        repaired: list[str] = []
        in_string = False
        escape = False
        index = 0
        while index < len(text):
            char = text[index]
            if in_string:
                if escape:
                    repaired.append(char)
                    escape = False
                elif char == "\\":
                    repaired.append(char)
                    escape = True
                elif char == '"':
                    rest = text[index + 1 :].lstrip()
                    if not rest or rest[0] in ",}]":
                        in_string = False
                        repaired.append(char)
                    elif rest[0] == '"':
                        in_string = False
                        repaired.append('",')
                    else:
                        repaired.append('\\"')
                elif char == "\n":
                    repaired.append("\\n")
                elif char == "\r":
                    pass
                elif char == "\t":
                    repaired.append("\\t")
                else:
                    repaired.append(char)
            else:
                if char == '"':
                    in_string = True
                repaired.append(char)
            index += 1
        return cls._repair_json("".join(repaired))

    def _parse_json(
        self,
        raw_content: Any,
    ) -> dict[str, Any]:
        """
        Parse the model output into a JSON object.

        Handles normal JSON, markdown fences, and accidental surrounding text.
        """

        if isinstance(raw_content, dict):
            return raw_content

        if isinstance(raw_content, (list, tuple)):
            raw_content = self._content_to_text(
                raw_content
            )

        if isinstance(raw_content, bytes):
            raw_content = raw_content.decode(
                "utf-8",
                errors="replace",
            )

        if not isinstance(raw_content, str):
            raise ValueError(
                "Model response is not text or JSON."
            )

        cleaned = raw_content.strip()

        if not cleaned:
            raise ValueError(
                "Model returned an empty response."
            )

        # Remove markdown JSON fences if a model ignores the instruction.
        cleaned = re.sub(
            r"^\s*```(?:json)?\s*",
            "",
            cleaned,
            flags=re.IGNORECASE,
        )

        cleaned = re.sub(
            r"\s*```\s*$",
            "",
            cleaned,
        ).strip()

        candidates = [
            cleaned,
            self._repair_json(cleaned),
            self._repair_loose(cleaned),
        ]
        result = None
        last_error: json.JSONDecodeError | None = None
        for candidate in candidates:
            parsed = self._loads_object(candidate)
            if isinstance(parsed, dict):
                result = parsed
                break
            if isinstance(parsed, json.JSONDecodeError):
                last_error = parsed

        if result is None:
            raise last_error or json.JSONDecodeError(
                "Product analysis JSON could not be read.",
                cleaned,
                0,
            )

        if not isinstance(result, dict):
            raise ValueError(
                "Product analysis must be an object."
            )

        return result

    def _normalize_result(
        self,
        result: dict[str, Any],
    ) -> dict[str, Any]:
        """
        Normalize and validate the model's output before it reaches
        the Commerce application.
        """

        confidence = result.get(
            "confidence",
            0,
        )

        try:
            confidence = float(
                confidence
            )
        except (
            TypeError,
            ValueError,
        ):
            confidence = 0

        confidence = max(
            0,
            min(
                1,
                confidence,
            ),
        )

        return {
            "name": str(
                result.get("name")
                or "Unnamed product"
            ).strip(),

            "category": str(
                result.get("category")
                or ""
            ).strip(),

            "color": self._visible_color(result),

            "short_description": str(
                result.get(
                    "short_description"
                )
                or ""
            ).strip(),

            "description": str(
                result.get("description")
                or ""
            ).strip(),

            "seo_title": str(
                result.get("seo_title")
                or ""
            ).strip(),

            "seo_description": str(
                result.get("seo_description")
                or ""
            ).strip(),

            "selling_points": self._string_list(
                result.get("selling_points")
            ),

            "keywords": self._string_list(
                result.get("keywords")
            ),

            "visual_attributes": (
                result.get(
                    "visual_attributes"
                )
                if isinstance(
                    result.get(
                        "visual_attributes"
                    ),
                    dict,
                )
                else {}
            ),

            "uncertain_attributes": self._string_list(
                result.get(
                    "uncertain_attributes"
                )
            ),

            "ai_summary": str(
                result.get("ai_summary")
                or ""
            ).strip(),

            "confidence": confidence,
        }

    @classmethod
    def _visible_color(cls, result: dict[str, Any]) -> str:
        """Read the colors the model saw, including older visual_attributes output."""

        for key in ("color", "colors", "colour", "colours"):
            text = cls._color_text(result.get(key))
            if text:
                return text

        visual = result.get("visual_attributes")
        if isinstance(visual, dict):
            for key in ("color", "colors", "colour", "colours"):
                text = cls._color_text(visual.get(key))
                if text:
                    return text
        return ""

    @staticmethod
    def _color_text(value: Any) -> str:
        if isinstance(value, str):
            return value.strip()[:160]
        if isinstance(value, (list, tuple)):
            parts = [
                str(item).strip()
                for item in value
                if str(item).strip()
            ]
            return ", ".join(parts)[:160]
        return ""

    @staticmethod
    def _string_list(
        value: Any,
    ) -> list[str]:
        """Return only meaningful string items."""

        if not isinstance(
            value,
            (list, tuple),
        ):
            return []

        return [
            str(item).strip()
            for item in value
            if str(item).strip()
        ]

    @staticmethod
    def _guess_mime_type(
        filename: str,
    ) -> str:
        """Determine a safe image MIME type from the filename."""

        extension = (
            filename.lower()
            .rsplit(".", 1)[-1]
        )

        mapping = {
            "jpg": "image/jpeg",
            "jpeg": "image/jpeg",
            "png": "image/png",
            "webp": "image/webp",
            "gif": "image/gif",
        }

        return mapping.get(
            extension,
            "image/jpeg",
        )