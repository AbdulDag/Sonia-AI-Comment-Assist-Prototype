"""
Stats router — dashboard aggregate metrics.

GET /api/stats
"""

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import DraftComment, Post, Review
from backend.schemas import (
    DecisionBreakdown,
    SafetyBreakdown,
    StatusBreakdown,
    StatsResponse,
)

router = APIRouter(prefix="/api", tags=["stats"])


@router.get("/stats", response_model=StatsResponse)
def get_stats(db: Session = Depends(get_db)) -> StatsResponse:
    """Return aggregate counts and rates for the dashboard."""

    total_posts = db.query(Post).count()
    total_drafts = db.query(DraftComment).count()
    total_reviews = db.query(Review).count()

    # Safety breakdown
    safe_count = db.query(Post).filter(Post.safety_status == "safe").count()
    flagged_count = db.query(Post).filter(Post.safety_status == "flagged").count()
    blocked_count = db.query(Post).filter(Post.safety_status == "blocked").count()
    pending_safety = db.query(Post).filter(Post.safety_status == "pending").count()

    # Workflow status breakdown
    pending_status = db.query(Post).filter(Post.status == "pending").count()
    reviewed_count = db.query(Post).filter(Post.status == "reviewed").count()
    skipped_count = db.query(Post).filter(Post.status == "skipped").count()

    # Review decision breakdown
    def _count(decision: str) -> int:
        return db.query(Review).filter(Review.decision == decision).count()

    approved = _count("approved")
    edited = _count("edited")
    rejected = _count("rejected")
    flagged_unsafe = _count("flagged_unsafe")

    # Average relevance score across all scored posts
    avg_raw = (
        db.query(func.avg(Post.relevance_score))
        .filter(Post.relevance_score.isnot(None))
        .scalar()
    )
    avg_relevance = round(float(avg_raw), 3) if avg_raw is not None else None

    # Approval rate = (approved + edited) / all decisions
    total_decisions = approved + edited + rejected + flagged_unsafe
    approval_rate = (
        round((approved + edited) / total_decisions, 3)
        if total_decisions > 0
        else None
    )

    return StatsResponse(
        total_posts=total_posts,
        total_drafts=total_drafts,
        total_reviews=total_reviews,
        safety=SafetyBreakdown(
            safe=safe_count,
            flagged=flagged_count,
            blocked=blocked_count,
            pending=pending_safety,
        ),
        status=StatusBreakdown(
            pending=pending_status,
            reviewed=reviewed_count,
            skipped=skipped_count,
        ),
        decisions=DecisionBreakdown(
            approved=approved,
            edited=edited,
            rejected=rejected,
            flagged_unsafe=flagged_unsafe,
        ),
        avg_relevance_score=avg_relevance,
        approval_rate=approval_rate,
    )
