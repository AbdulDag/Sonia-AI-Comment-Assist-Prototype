"""
Reviews router — submit a reviewer decision on a draft comment.

POST /api/posts/{id}/review
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import DraftComment, Post, Review
from backend.schemas import ReviewOut, ReviewRequest, ReviewResponse

router = APIRouter(prefix="/api/posts", tags=["reviews"])


@router.post("/{post_id}/review", response_model=ReviewResponse)
def submit_review(
    post_id: str,
    body: ReviewRequest,
    db: Session = Depends(get_db),
) -> ReviewResponse:
    """
    Record a reviewer decision for a draft comment.

    Decision effects on post status:
        approved / edited    → post.status = "reviewed"
        rejected             → post.status = "skipped"
        flagged_unsafe       → post.status = "skipped", post.safety_status = "flagged"

    For "edited" decisions, edited_text must be supplied.
    """
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    draft = (
        db.query(DraftComment)
        .filter(DraftComment.id == body.draft_id, DraftComment.post_id == post_id)
        .first()
    )
    if not draft:
        raise HTTPException(
            status_code=404, detail="Draft not found for this post"
        )

    if body.decision == "edited" and not body.edited_text:
        raise HTTPException(
            status_code=422,
            detail="edited_text is required when decision is 'edited'",
        )

    review = Review(
        post_id=post_id,
        draft_id=body.draft_id,
        decision=body.decision,
        edited_text=body.edited_text,
        reviewer_notes=body.reviewer_notes,
    )
    db.add(review)

    # Update post workflow state based on the decision
    if body.decision in ("approved", "edited"):
        post.status = "reviewed"
    elif body.decision == "rejected":
        post.status = "skipped"
    elif body.decision == "flagged_unsafe":
        post.status = "skipped"
        post.safety_status = "flagged"

    db.commit()
    db.refresh(review)

    return ReviewResponse(
        review=ReviewOut.model_validate(review, from_attributes=True),
        post_status=post.status,
    )
