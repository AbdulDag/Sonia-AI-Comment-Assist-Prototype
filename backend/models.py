import json
import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from backend.database import Base


def _new_uuid() -> str:
    return str(uuid.uuid4())


class Post(Base):
    """
    Ingested social post awaiting scoring, safety classification, and review.

    safety_flags is stored as a JSON-encoded list, e.g. '["crisis", "minor"]'.
    Use the .safety_flags_list property for Python-side access.
    """

    __tablename__ = "posts"

    id = Column(String, primary_key=True, default=_new_uuid)
    platform = Column(String, nullable=False)       # reddit / tiktok / instagram / mock
    subreddit = Column(String, nullable=True)        # null for non-Reddit platforms
    author = Column(String, nullable=False)
    title = Column(String, nullable=True)            # Reddit posts have titles; comments don't
    body = Column(Text, nullable=False)
    url = Column(String, nullable=True)
    upvotes = Column(Integer, default=0)
    comment_count = Column(Integer, default=0)
    created_at = Column(DateTime, nullable=False)
    ingested_at = Column(DateTime, default=datetime.utcnow)

    # AI scoring fields — populated by the AI pipeline (Phase 2)
    relevance_score = Column(Float, nullable=True)   # 0.0 – 1.0
    relevance_reason = Column(Text, nullable=True)
    safety_status = Column(String, default="pending")  # pending / safe / flagged / blocked
    safety_flags = Column(Text, default="[]")           # JSON-encoded list of flag strings

    # Workflow status
    status = Column(String, default="pending")          # pending / reviewed / skipped

    drafts = relationship(
        "DraftComment", back_populates="post", cascade="all, delete-orphan"
    )
    reviews = relationship(
        "Review", back_populates="post", cascade="all, delete-orphan"
    )

    @property
    def safety_flags_list(self) -> list[str]:
        return json.loads(self.safety_flags or "[]")

    @safety_flags_list.setter
    def safety_flags_list(self, value: list[str]) -> None:
        self.safety_flags = json.dumps(value)

    def __repr__(self) -> str:
        return f"<Post id={self.id} platform={self.platform} status={self.status}>"


class DraftComment(Base):
    """
    LLM-generated comment draft for a post.
    Multiple versions can exist per post (on regeneration version increments).
    """

    __tablename__ = "draft_comments"

    id = Column(String, primary_key=True, default=_new_uuid)
    post_id = Column(String, ForeignKey("posts.id"), nullable=False)
    draft_text = Column(Text, nullable=False)
    version = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)

    post = relationship("Post", back_populates="drafts")
    reviews = relationship("Review", back_populates="draft")

    def __repr__(self) -> str:
        return f"<DraftComment id={self.id} post_id={self.post_id} v{self.version}>"


class Review(Base):
    """
    Human reviewer decision on a draft comment.
    decision must be one of: approved / edited / rejected / flagged_unsafe
    edited_text is only populated when decision == 'edited'.
    """

    __tablename__ = "reviews"

    id = Column(String, primary_key=True, default=_new_uuid)
    post_id = Column(String, ForeignKey("posts.id"), nullable=False)
    draft_id = Column(String, ForeignKey("draft_comments.id"), nullable=False)
    decision = Column(String, nullable=False)  # approved / edited / rejected / flagged_unsafe
    edited_text = Column(Text, nullable=True)
    reviewer_notes = Column(Text, nullable=True)
    reviewed_at = Column(DateTime, default=datetime.utcnow)

    post = relationship("Post", back_populates="reviews")
    draft = relationship("DraftComment", back_populates="reviews")

    def __repr__(self) -> str:
        return f"<Review id={self.id} decision={self.decision}>"
