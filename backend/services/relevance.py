"""
Relevance scoring service.

Calls Claude to score a post 0.0–1.0 on how relevant it is for Sonia's
growth team to engage with.  JSON output is enforced via assistant prefilling:
the model is forced to begin its response with "{", guaranteeing valid JSON.
"""

import json
import logging
from pathlib import Path

import anthropic

from backend.config import settings

logger = logging.getLogger(__name__)

MODEL = "claude-3-5-sonnet-20241022"
_PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "relevance.txt"

# Module-level client — created once and reused across calls.
_client: anthropic.Anthropic | None = None


def _get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        _client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    return _client


def _load_system_prompt() -> str:
    return _PROMPT_PATH.read_text(encoding="utf-8").strip()


def score_relevance(post_content: str) -> dict:
    """Score a post for relevance to Sonia's growth team.

    Uses assistant prefilling to strictly enforce JSON output: the assistant
    turn is pre-seeded with "{", so the model can only complete valid JSON.
    If parsing fails on the first attempt a single retry is performed.

    Args:
        post_content: The raw text of the post (title + body, or body alone).

    Returns:
        A dict with:
            - ``score``  (float, 0.0–1.0): relevance score, clamped to range.
            - ``reason`` (str): one-sentence explanation of the score.

    Raises:
        ValueError: if a parseable JSON response cannot be obtained after 2 attempts.
        anthropic.APIError: on upstream API failures.
    """
    client = _get_client()
    system_prompt = _load_system_prompt()
    last_exc: Exception | None = None

    for attempt in range(1, 3):
        try:
            response = client.messages.create(
                model=MODEL,
                max_tokens=256,
                temperature=0,
                system=system_prompt,
                messages=[
                    {"role": "user", "content": post_content},
                    # Prefill forces the model to complete a JSON object.
                    {"role": "assistant", "content": "{"},
                ],
            )

            # Reconstruct the full JSON string (prefill + model continuation).
            raw = "{" + response.content[0].text
            result = json.loads(raw)

            score = max(0.0, min(1.0, float(result["score"])))
            reason = str(result["reason"])
            return {"score": score, "reason": reason}

        except (json.JSONDecodeError, KeyError, ValueError, TypeError) as exc:
            logger.warning(
                "relevance: JSON parse failed (attempt %d/2): %s", attempt, exc
            )
            last_exc = exc

    raise ValueError(
        "score_relevance: could not parse a valid JSON response after 2 attempts"
    ) from last_exc
