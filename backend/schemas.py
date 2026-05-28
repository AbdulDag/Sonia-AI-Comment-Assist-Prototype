"""
Pydantic request and response schemas for the Sonia Comment-Assist API.

All ORM-backed schemas that include the JSON-encoded safety_flags field
use an explicit from_orm_post() classmethod instead of model_validate
with from_attributes=True, since the field requires decoding from Text.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, field_validator

# ---------------------------------------------------------------------------
# Valid decision values — shared between schema validation and router logic
# ---------------------------------------------------------------------------

VALID_DECISIONS: frozenset[str] = frozenset(
    {"approved", "edited", "rejected", "flagged_unsafe"}
)


# ---------------------------------------------------------------------------
# Draft
# ---------------------------------------------------------------------------


class DraftOut(BaseModel):
    id: str
    post_id: str
    draft_text: str
    version: int
    created_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Review
# ---------------------------------------------------------------------------


class ReviewOut(BaseModel):
    id: str
    post_id: str
    draft_id: str
    decision: str
    edited_text: Optional[str] = None
    reviewer_notes: Optional[str] = None
    reviewed_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Post — summary (list view) and detail (single post with relations)
# ---------------------------------------------------------------------------


class PostSummary(BaseModel):
    id: str
    platform: str
    subreddit: Optional[str] = None
    author: str
    title: Optional[str] = None
    body: str
    url: Optional[str] = None
    upvotes: int
    comment_count: int
    created_at: datetime
    ingested_at: Optional[datetime] = None
    relevance_score: Optional[float] = None
    relevance_reason: Optional[str] = None
    safety_status: str
    safety_flags: list[str]
    status: str

    @classmethod
    def from_orm_post(cls, post) -> "PostSummary":
        return cls(
            id=post.id,
            platform=post.platform,
            subreddit=post.subreddit,
            author=post.author,
            title=post.title,
            body=post.body,
            url=post.url,
            upvotes=post.upvotes or 0,
            comment_count=post.comment_count or 0,
            created_at=post.created_at,
            ingested_at=post.ingested_at,
            relevance_score=post.relevance_score,
            relevance_reason=post.relevance_reason,
            safety_status=post.safety_status,
            safety_flags=post.safety_flags_list,
            status=post.status,
        )


class PostDetail(PostSummary):
    drafts: list[DraftOut]
    reviews: list[ReviewOut]

    @classmethod
    def from_orm_post(cls, post) -> "PostDetail":
        return cls(
            id=post.id,
            platform=post.platform,
            subreddit=post.subreddit,
            author=post.author,
            title=post.title,
            body=post.body,
            url=post.url,
            upvotes=post.upvotes or 0,
            comment_count=post.comment_count or 0,
            created_at=post.created_at,
            ingested_at=post.ingested_at,
            relevance_score=post.relevance_score,
            relevance_reason=post.relevance_reason,
            safety_status=post.safety_status,
            safety_flags=post.safety_flags_list,
            status=post.status,
            drafts=[
                DraftOut.model_validate(d, from_attributes=True)
                for d in sorted(post.drafts, key=lambda d: d.version)
            ],
            reviews=[
                ReviewOut.model_validate(r, from_attributes=True)
                for r in sorted(post.reviews, key=lambda r: r.reviewed_at)
            ],
        )


# ---------------------------------------------------------------------------
# Post list (paginated)
# ---------------------------------------------------------------------------


class PostListResponse(BaseModel):
    posts: list[PostSummary]
    total: int
    page: int
    limit: int
    pages: int


# ---------------------------------------------------------------------------
# Ingest
# ---------------------------------------------------------------------------


class IngestResponse(BaseModel):
    total_found: int
    inserted: int
    skipped_existing: int
    blocked: int
    flagged: int
    safe: int
    errors: int


# ---------------------------------------------------------------------------
# Draft generation
# ---------------------------------------------------------------------------


class DraftResponse(BaseModel):
    draft: DraftOut
    post_id: str


# ---------------------------------------------------------------------------
# Review submission
# ---------------------------------------------------------------------------


class ReviewRequest(BaseModel):
    draft_id: str
    decision: str
    edited_text: Optional[str] = None
    reviewer_notes: Optional[str] = None

    @field_validator("decision")
    @classmethod
    def decision_must_be_valid(cls, v: str) -> str:
        if v not in VALID_DECISIONS:
            raise ValueError(
                f"decision must be one of: {', '.join(sorted(VALID_DECISIONS))}"
            )
        return v

    @field_validator("edited_text")
    @classmethod
    def edited_text_required_when_edited(cls, v: Optional[str], info) -> Optional[str]:
        # Cross-field validation handled in the router where we have full context,
        # but we strip empty strings here to normalise.
        if v is not None and v.strip() == "":
            return None
        return v


class ReviewResponse(BaseModel):
    review: ReviewOut
    post_status: str


# ---------------------------------------------------------------------------
# Stats dashboard
# ---------------------------------------------------------------------------


class SafetyBreakdown(BaseModel):
    safe: int
    flagged: int
    blocked: int
    pending: int


class StatusBreakdown(BaseModel):
    pending: int
    reviewed: int
    skipped: int


class DecisionBreakdown(BaseModel):
    approved: int
    edited: int
    rejected: int
    flagged_unsafe: int


class StatsResponse(BaseModel):
    total_posts: int
    total_drafts: int
    total_reviews: int
    safety: SafetyBreakdown
    status: StatusBreakdown
    decisions: DecisionBreakdown
    avg_relevance_score: Optional[float] = None
    approval_rate: Optional[float] = None
