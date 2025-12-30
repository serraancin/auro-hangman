"""Reusable Claude API client.

This module provides a small, dependency-light wrapper around Anthropic's Claude
Messages API so it can be imported by any Flask app, background worker, or
script in the repo. Example usage:

    from services.claude_client import ClaudeClient

    claude = ClaudeClient()
    response = claude.generate_text(
        prompt="Create a friendly clue for the word 'photosynthesis'."
    )
    print(response)

The class pulls the API key from the ``CLAUDE_API_KEY`` environment variable by
default, but you can also pass a key explicitly when instantiating it. The
module does not depend on Flask and can be reused across projects.
"""

from __future__ import annotations

import os
from typing import Any, Dict, Iterable, List, Optional

import requests


class ClaudeClientError(RuntimeError):
    """Raised when the Claude API returns an error payload."""


class ClaudeClient:
    """Lightweight helper for calling Anthropic's Claude Messages API."""

    DEFAULT_BASE_URL = "https://api.anthropic.com"
    DEFAULT_MODEL = "claude-3-haiku-20240307"
    API_VERSION = "2023-06-01"

    def __init__(
        self,
        api_key: Optional[str] = None,
        *,
        model: str = DEFAULT_MODEL,
        base_url: str = DEFAULT_BASE_URL,
        request_timeout: int = 30,
        session: Optional[requests.Session] = None,
    ) -> None:
        self.api_key = api_key or os.getenv("CLAUDE_API_KEY")
        if not self.api_key:
            raise ValueError(
                "Claude API key missing. Provide it via CLAUDE_API_KEY env var or api_key argument."
            )

        self.model = model
        self.base_url = base_url.rstrip("/")
        self.request_timeout = request_timeout
        self._session = session or requests.Session()
        self._session.headers.update(
            {
                "x-api-key": self.api_key,
                "anthropic-version": self.API_VERSION,
                "content-type": "application/json",
            }
        )

    # ------------------------------------------------------------------
    # Public helpers
    # ------------------------------------------------------------------
    def generate_text(
        self,
        *,
        prompt: str,
        system: Optional[str] = None,
        max_tokens: int = 400,
        temperature: float = 0.5,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> str:
        """Return the combined text output from Claude for a single prompt."""

        payload = self._build_payload(
            messages=[{"role": "user", "content": prompt}],
            system=system,
            max_tokens=max_tokens,
            temperature=temperature,
            metadata=metadata,
        )
        data = self._post_json("/v1/messages", payload)
        return self._join_response_text(data)

    def chat(
        self,
        messages: Iterable[Dict[str, Any]],
        *,
        system: Optional[str] = None,
        max_tokens: int = 600,
        temperature: float = 0.3,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Send an arbitrary list of message dicts and return the raw response."""

        payload = self._build_payload(
            messages=list(messages),
            system=system,
            max_tokens=max_tokens,
            temperature=temperature,
            metadata=metadata,
        )
        return self._post_json("/v1/messages", payload)

    def generate_structured_json(
        self,
        *,
        prompt: str,
        response_schema: Dict[str, Any],
        system: Optional[str] = None,
        max_tokens: int = 800,
        temperature: float = 0,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Ask Claude for JSON that matches ``response_schema``."""

        payload = self._build_payload(
            messages=[{"role": "user", "content": prompt}],
            system=system,
            max_tokens=max_tokens,
            temperature=temperature,
            metadata=metadata,
        )
        payload["response_format"] = {"type": "json_schema", "json_schema": response_schema}

        data = self._post_json("/v1/messages", payload)
        text = self._join_response_text(data)
        return json_loads_safely(text)

    # ------------------------------------------------------------------
    # Resource management
    # ------------------------------------------------------------------
    def close(self) -> None:
        self._session.close()

    def __enter__(self) -> "ClaudeClient":
        return self

    def __exit__(self, exc_type, exc, tb) -> None:
        self.close()

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------
    def _build_payload(
        self,
        *,
        messages: List[Dict[str, Any]],
        system: Optional[str],
        max_tokens: int,
        temperature: float,
        metadata: Optional[Dict[str, Any]],
    ) -> Dict[str, Any]:
        payload: Dict[str, Any] = {
            "model": self.model,
            "max_tokens": max_tokens,
            "messages": messages,
            "temperature": temperature,
        }
        if system:
            payload["system"] = system
        if metadata:
            payload["metadata"] = metadata
        return payload

    def _post_json(self, path: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        url = f"{self.base_url}{path}"
        response = self._session.post(url, json=payload, timeout=self.request_timeout)
        try:
            response.raise_for_status()
        except requests.exceptions.HTTPError as e:
            try:
                error_data = response.json()
                error_msg = error_data.get("error", {}).get("message", str(e))
            except:
                error_msg = str(e)
            raise ClaudeClientError(f"HTTP {response.status_code}: {error_msg}") from e
        data = response.json()
        if "error" in data:
            raise ClaudeClientError(data["error"].get("message", "Claude API error"))
        return data

    @staticmethod
    def _join_response_text(data: Dict[str, Any]) -> str:
        parts: List[str] = []
        for block in data.get("content", []):
            if block.get("type") == "text" and block.get("text"):
                parts.append(block["text"])
        return "".join(parts).strip()


def json_loads_safely(payload: str) -> Dict[str, Any]:
    """Return JSON without blowing up on trailing markdown fences."""

    import json

    cleaned = payload.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.strip("`")
        cleaned = cleaned.lstrip("json\n").lstrip("JSON\n")
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as exc:  # pragma: no cover - defensive
        raise ClaudeClientError(f"Claude returned invalid JSON: {exc}") from exc
