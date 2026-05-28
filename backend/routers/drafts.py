"""
Drafts router — generate or regenerate a comment draft for a post.

POST /api/posts/{id}/draft
"""

import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import DraftComment, Post
from backend.schemas import DraftOut, DraftResponse
from backend.services import draft_comment

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/posts", tags=["drafts"])


def _build_post_content(post: Post) -> str:
    title = (post.title or "").strip()
    body = (post.body or "").strip()
    return f"{title}\n\n{body}" if title else body


@router.post("/{post_id}/draft", response_model=DraftResponse)
def generate_draft(post_id: str, db: Session = Depends(get_db)) -> DraftResponse:
    """
    Generate a new comment draft for the given post.

    Calls the Claude-based drafting service and saves the result as a new
    DraftComment row.  The version number is incremented automatically on
    each call so regeneration history is preserved.

    Blocked posts are rejected — drafting is only allowed for safe or
    flagged (reviewer-approved) posts.
    """
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    if post.safety_status == "blocked":
        raise HTTPException(
            status_code=422,
            detail="Cannot generate a draft for a blocked post.",
        )

    content = _build_post_content(post)

    try:
        draft_text = draft_comment(content)
    except Exception as exc:
        logger.error("draft: LLM call failed for post %s — %s", post_id, exc)
        raise HTTPException(
            status_code=502,
            detail="Draft generation failed — upstream LLM error.",
        ) from exc

    existing_versions = (
        db.query(DraftComment.version)
        .filter(DraftComment.post_id == post_id)
        .all()
    )
    next_version = max((v[0] for v in existing_versions), default=0) + 1

    draft = DraftComment(
        post_id=post_id,
        draft_text=draft_text,
        version=next_version,
    )
    db.add(draft)
    db.commit()
    db.refresh(draft)

    return DraftResponse(
        draft=DraftOut.model_validate(draft, from_attributes=True),
        post_id=post_id,
    )
