"""
Safety classification service.

Calls Claude to screen a post for safety risks before any comment is drafted
or engagement is allowed.  JSON output is enforced via assistant prefilling.

Safety is the highest-priority concern in this application.  When in doubt,
the classifier is instructed to flag rather than allow.
"""

import json
import logging
from pathlib import Path
from typing import Literal

import anthropic

from backend.config import settings

logger = logging.getLogger(__name__)

MODEL = "claude-sonnet-4-20250514"
_PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "safety.txt"

VALID_ACTIONS: frozenset[str] = frozenset({"allow", "flag", "block"})
VALID_FLAGS: frozenset[str] = frozenset(
    {"crisis", "self_harm", "minor", "legal", "medical_claim", "grief", "privacy"}
)

_client: anthropic.Anthropic | None = None


def _get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        _client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    return _client


def _load_system_prompt() -> str:
    return _PROMPT_PATH.read_text(encoding="utf-8").strip()


def _fail_safe(reason: str) -> dict:
    """Return a conservative block decision when the LLM response is unparseable.

    This ensures that a pipeline or parsing failure never accidentally
    allows an unsafe post through.
    """
    logger.error("safety: falling back to conservative block — %s", reason)
    return {
        "safe": False,
        "action": "block",
        "flags": [],
        "reason": f"[PARSE ERROR — blocked by fail-safe] {reason}",
    }


def classify_safety(post_content: str) -> dict:
    """Classify a post for safety risks.

    Uses assistant prefilling to strictly enforce JSON output.  If parsing
    fails on both attempts the function returns a conservative *block* decision
    rather than raising, so a pipeline failure never silently allows an unsafe
    post through.

    Args:
        post_content: The raw text of the post (title + body, or body alone).

    Returns:
        A dict with:
            - ``safe``   (bool): True only when action is "allow".
            - ``action`` (str): "allow" | "flag" | "block".
            - ``flags``  (list[str]): applicable flag identifiers (may be empty).
            - ``reason`` (str): one-sentence classification summary.

    Raises:
        anthropic.APIError: on upstream API failures (network, auth, rate-limit).
    """
    client = _get_client()
    system_prompt = _load_system_prompt()
    last_raw = ""

    for attempt in range(1, 3):
        try:
            response = client.messages.create(
                model=MODEL,
                max_tokens=512,
                temperature=0,
                system=system_prompt,
                messages=[
                    {"role": "user", "content": post_content},
                    # Prefill forces the model to complete a JSON object.
                    {"role": "assistant", "content": "{"},
                ],
            )

            last_raw = "{" + response.content[0].text
            result = json.loads(last_raw)

            action = str(result["action"]).lower()
            if action not in VALID_ACTIONS:
                raise ValueError(f"unrecognised action value: {action!r}")

            safe = bool(result["safe"])
            # Consistency guard: action="allow" ↔ safe=True
            if action == "allow" and not safe:
                safe = True
            elif action in ("flag", "block") and safe:
                safe = False

            raw_flags = result.get("flags") or []
            flags = [str(f) for f in raw_flags if str(f) in VALID_FLAGS]

            reason = str(result["reason"])
            return {"safe": safe, "action": action, "flags": flags, "reason": reason}

        except (json.JSONDecodeError, KeyError, ValueError, TypeError) as exc:
            logger.warning(
                "safety: JSON parse failed (attempt %d/2): %s — raw: %.200s",
                attempt,
                exc,
                last_raw,
            )

    return _fail_safe(f"unparseable LLM response after 2 attempts: {last_raw[:120]}")
