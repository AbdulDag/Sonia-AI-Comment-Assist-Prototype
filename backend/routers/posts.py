"""
Posts router — list, detail, and batch ingestion endpoints.

GET  /api/posts           — paginated + filterable post list
GET  /api/posts/export    — download all posts as a CSV file
GET  /api/posts/{id}      — single post with all drafts and reviews
POST /api/posts/ingest    — load mock data through the AI pipeline and persist

Route declaration order matters: /export and /ingest must be registered before
/{post_id} so FastAPI does not treat those literal strings as path parameters.
"""

import csv
import io
import json
import logging
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import or_
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import Post
from backend.schemas import (
    IngestResponse,
    PostDetail,
    PostListResponse,
    PostSummary,
    SafetyOverrideRequest,
    SafetyOverrideResponse,
)
from backend.services import classify_safety, score_relevance

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/posts", tags=["posts"])

_MOCK_DATA_PATH = Path(__file__).parent.parent / "data" / "mock_posts.json"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _build_post_content(raw: dict) -> str:
    """Combine title and body into a single string for the AI pipeline."""
    title = (raw.get("title") or "").strip()
    body = (raw.get("body") or "").strip()
    return f"{title}\n\n{body}" if title else body


def _build_post_content_from_orm(post: Post) -> str:
    title = (post.title or "").strip()
    body = (post.body or "").strip()
    return f"{title}\n\n{body}" if title else body


# ---------------------------------------------------------------------------
# GET /api/posts
# ---------------------------------------------------------------------------


@router.get("", response_model=PostListResponse)
def list_posts(
    platform: str | None = Query(None, description="Filter by platform"),
    safety_status: str | None = Query(
        None, description="Filter by safety status (safe/flagged/blocked/pending)"
    ),
    status: str | None = Query(
        None, description="Filter by workflow status (pending/reviewed/skipped)"
    ),
    min_relevance: float | None = Query(
        None, ge=0.0, le=1.0, description="Minimum relevance score"
    ),
    search: str | None = Query(None, description="Keyword search across title, body, author"),
    include_blocked: bool = Query(
        False, description="Include blocked posts (hidden by default)"
    ),
    page: int = Query(1, ge=1, description="1-based page number"),
    limit: int = Query(20, ge=1, le=100, description="Results per page"),
    db: Session = Depends(get_db),
) -> PostListResponse:
    query = db.query(Post)

    if not include_blocked:
        query = query.filter(Post.safety_status != "blocked")

    if platform:
        query = query.filter(Post.platform == platform)

    if safety_status:
        query = query.filter(Post.safety_status == safety_status)

    if status:
        query = query.filter(Post.status == status)

    if min_relevance is not None:
        query = query.filter(Post.relevance_score >= min_relevance)

    if search:
        term = f"%{search}%"
        query = query.filter(
            or_(
                Post.title.ilike(term),
                Post.body.ilike(term),
                Post.author.ilike(term),
            )
        )

    # Sort highest relevance first; NULLs go to the end (SQLite places NULLs
    # last in DESC order since it considers NULL the smallest value).
    query = query.order_by(Post.relevance_score.desc())

    total = query.count()
    posts = query.offset((page - 1) * limit).limit(limit).all()
    pages = max(1, (total + limit - 1) // limit)

    return PostListResponse(
        posts=[PostSummary.from_orm_post(p) for p in posts],
        total=total,
        page=page,
        limit=limit,
        pages=pages,
    )


# ---------------------------------------------------------------------------
# GET /api/posts/export
# NOTE: declared before /{post_id} to prevent "export" matching the path param
# ---------------------------------------------------------------------------


@router.get("/export")
def export_posts(db: Session = Depends(get_db)) -> StreamingResponse:
    posts = db.query(Post).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "id", "platform", "subreddit", "author", "title",
        "relevance_score", "safety_status", "safety_flags", "status",
        "created_at", "url"
    ])
    for p in posts:
        writer.writerow([
            p.id, p.platform, p.subreddit, p.author, p.title,
            p.relevance_score, p.safety_status, p.safety_flags,
            p.status, p.created_at, p.url
        ])

    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode()),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=posts.csv"}
    )


# ---------------------------------------------------------------------------
# POST /api/posts/ingest
# NOTE: declared before /{post_id} to prevent "ingest" matching the path param
# ---------------------------------------------------------------------------


@router.post("/ingest", response_model=IngestResponse)
def ingest_posts(
    limit: int = Query(
        10,
        ge=1,
        le=50,
        description="Maximum number of new posts to process through the AI pipeline",
    ),
    db: Session = Depends(get_db),
) -> IngestResponse:
    """
    Load raw posts from the mock dataset, run each through relevance scoring
    and safety classification, then persist the results.  Posts already in the
    database are skipped so the endpoint is safe to call multiple times.
    """
    if not _MOCK_DATA_PATH.exists():
        raise HTTPException(status_code=500, detail="Mock data file not found")

    raw_data = json.loads(_MOCK_DATA_PATH.read_text(encoding="utf-8"))
    raw_posts: list[dict] = raw_data.get("posts", [])

    existing_ids: set[str] = {row[0] for row in db.query(Post.id).all()}

    counts = {
        "total_found": len(raw_posts),
        "inserted": 0,
        "skipped_existing": 0,
        "blocked": 0,
        "flagged": 0,
        "safe": 0,
        "errors": 0,
    }

    processed = 0
    for raw in raw_posts:
        if processed >= limit:
            break

        post_id: str = raw.get("id", "")

        if post_id in existing_ids:
            counts["skipped_existing"] += 1
            continue

        try:
            content = _build_post_content(raw)

            relevance = score_relevance(content)
            safety = classify_safety(content)

            # Normalise service action values to DB safety_status vocabulary
            action = safety["action"]
            if action == "allow":
                safety_status = "safe"
            elif action == "flag":
                safety_status = "flagged"
            else:
                safety_status = "blocked"

            post = Post(
                id=post_id,
                platform=raw["platform"],
                subreddit=raw.get("subreddit"),
                author=raw["author"],
                title=raw.get("title"),
                body=raw["body"],
                url=raw.get("url"),
                upvotes=raw.get("upvotes", 0),
                comment_count=raw.get("comment_count", 0),
                created_at=datetime.fromisoformat(raw["created_at"]),
                ingested_at=datetime.utcnow(),
                relevance_score=relevance["score"],
                relevance_reason=relevance["reason"],
                safety_status=safety_status,
                status="pending",
            )
            post.safety_flags_list = safety["flags"]

            db.add(post)
            db.commit()

            counts["inserted"] += 1
            counts[safety_status if safety_status in ("blocked", "flagged") else "safe"] += 1
            processed += 1

        except Exception as exc:
            logger.error("ingest: failed on post %r — %s", post_id, exc)
            db.rollback()
            counts["errors"] += 1

    return IngestResponse(**counts)


# ---------------------------------------------------------------------------
# PATCH /api/posts/{post_id}/safety
# NOTE: declared before /{post_id} so FastAPI matches the literal "/safety"
# suffix before treating it as a nested path parameter.
# ---------------------------------------------------------------------------


@router.patch("/{post_id}/safety", response_model=SafetyOverrideResponse)
def override_safety(
    post_id: str,
    body: SafetyOverrideRequest,
    db: Session = Depends(get_db),
) -> SafetyOverrideResponse:
    """
    Manually override the safety classification of a post.

    Allows reviewers to force a post's safety_status to safe, flagged, or
    blocked without going through the AI pipeline.  The change is persisted
    immediately and reflected in all subsequent API responses.
    """
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    post.safety_status = body.safety_status
    db.commit()

    return SafetyOverrideResponse(post_id=post_id, safety_status=body.safety_status)


# ---------------------------------------------------------------------------
# GET /api/posts/{post_id}
# ---------------------------------------------------------------------------


@router.get("/{post_id}", response_model=PostDetail)
def get_post(post_id: str, db: Session = Depends(get_db)) -> PostDetail:
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return PostDetail.from_orm_post(post)
