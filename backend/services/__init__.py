"""
AI pipeline services for the Sonia Comment-Assist backend.

Public surface:
    score_relevance(post_content)  -> {"score": float, "reason": str}
    classify_safety(post_content)  -> {"safe": bool, "action": str, "flags": list, "reason": str}
    draft_comment(post_content)    -> str  (plain text, 2–4 sentences)
"""

from backend.services.drafting import draft_comment
from backend.services.relevance import score_relevance
from backend.services.safety import classify_safety

__all__ = ["score_relevance", "classify_safety", "draft_comment"]
