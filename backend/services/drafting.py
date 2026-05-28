"""
Comment drafting service.

Calls Claude to write a warm, human-sounding comment that Sonia's growth
team can review before posting.  The output is plain text (no JSON).

Hard constraints enforced via the system prompt:
  - 2–4 sentences maximum
  - No medical claims, no diagnosis language
  - No fear-based or manipulative language
  - Frame as personal experience, not advertising
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


def draft_comment(post_content: str) -> str:
    """Draft a comment for a post that has already passed safety screening.

    The system prompt enforces the 2–4 sentence limit and bans medical claims
    or manipulative language.  A single LLM call is made; the output is
    returned as-is after light cleanup (stripping wrapper quotes).

    Args:
        post_content: The raw text of the post (title + body, or body alone).
            Only call this for posts whose safety classification is "allow" or
            "flag" with explicit reviewer approval — never for "block" posts.

    Returns:
        A plain-text comment string ready for human review.

    Raises:
        anthropic.APIError: on upstream API failures.
        ValueError: if the returned draft is empty after cleanup.
    """
    client = _get_client()
    system_prompt = _load_system_prompt()

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
    if sentence_count > 4:
        logger.warning(
            "draft_comment: response has %d sentences (expected 2–4); "
            "returning as-is for human review",
            sentence_count,
        )

    return draft
