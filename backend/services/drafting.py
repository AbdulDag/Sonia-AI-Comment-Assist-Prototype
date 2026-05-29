"""
Comment drafting service.

Calls Claude to write a concise, transparent comment from the Sonia team
that the growth team can review before posting. The output is plain text (no JSON).

Hard constraints enforced via the system prompt:
  - 3 sentences maximum
  - Written from an explicit Sonia team member perspective (no fake third-party framing)
  - No medical claims, no diagnosis language
  - No fear-based or manipulative language
  - No em dashes; banned words: ambient dread, stressor, journey, delve, navigating
"""

import logging
import re
from pathlib import Path

import anthropic

from backend.config import settings

logger = logging.getLogger(__name__)

MODEL = "claude-sonnet-4-20250514"
_PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "drafting.txt"

_client: anthropic.Anthropic | None = None


def _get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        _client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    return _client


def _load_system_prompt() -> str:
    return _PROMPT_PATH.read_text(encoding="utf-8").strip()


def _strip_wrapping_quotes(text: str) -> str:
    """Remove surrounding double-quotes that some models add around the output."""
    text = text.strip()
    if text.startswith('"') and text.endswith('"') and len(text) > 1:
        text = text[1:-1].strip()
    return text


def _count_sentences(text: str) -> int:
    """Rough sentence count — split on terminal punctuation."""
    sentences = re.split(r"(?<=[.!?])\s+", text.strip())
    return len([s for s in sentences if s])


def draft_comment(post_content: str, steering_prompt: str | None = None) -> str:
    """Draft a comment for a post that has already passed safety screening.

    The system prompt enforces the 3-sentence limit, requires an explicit Sonia
    team voice, and bans medical claims, manipulative language, em dashes, and
    a specific set of overused wellness buzzwords. A single LLM call is made;
    the output is returned as-is after light cleanup (stripping wrapper quotes).

    Args:
        post_content: The raw text of the post (title + body, or body alone).
            Only call this for posts whose safety classification is "allow" or
            "flag" with explicit reviewer approval — never for "block" posts.
        steering_prompt: Optional reviewer instruction appended to the system
            prompt to guide tone, length, or framing of the regenerated draft.

    Returns:
        A plain-text comment string ready for human review.

    Raises:
        anthropic.APIError: on upstream API failures.
        ValueError: if the returned draft is empty after cleanup.
    """
    client = _get_client()
    system_prompt = _load_system_prompt()

    if steering_prompt and steering_prompt.strip():
        system_prompt = (
            f"{system_prompt}\n\n"
            f"The reviewer has requested the following adjustment: {steering_prompt.strip()}"
        )

    response = client.messages.create(
        model=MODEL,
        max_tokens=512,
        # Slight temperature to produce natural variation across regenerations,
        # while still staying controlled and on-prompt.
        temperature=0.7,
        system=system_prompt,
        messages=[
            {"role": "user", "content": post_content},
        ],
    )

    draft = _strip_wrapping_quotes(response.content[0].text)

    if not draft:
        raise ValueError("draft_comment: LLM returned an empty response")

    sentence_count = _count_sentences(draft)
    if sentence_count > 3:
        logger.warning(
            "draft_comment: response has %d sentences (expected max 3); "
            "returning as-is for human review",
            sentence_count,
        )

    return draft
