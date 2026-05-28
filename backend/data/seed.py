"""
Seed script — reads mock_posts.json and populates the SQLite database.

Run from the project root:
    python backend/data/seed.py

The script is idempotent: it clears all existing rows before reinserting,
so it is safe to run multiple times during development.
"""

import json
import sys
from datetime import datetime
from pathlib import Path

# Ensure the project root is on sys.path so backend.* imports resolve
# regardless of which directory the script is invoked from.
PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT))

from backend.database import SessionLocal, init_db  # noqa: E402
from backend.models import DraftComment, Post, Review  # noqa: E402

DATA_FILE = Path(__file__).parent / "mock_posts.json"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _parse_dt(value: str | None) -> datetime | None:
    if not value:
        return None
    return datetime.fromisoformat(value)


# ---------------------------------------------------------------------------
# Main seed routine
# ---------------------------------------------------------------------------

def seed() -> None:
    print("Initialising database …")
    init_db()

    raw = DATA_FILE.read_text(encoding="utf-8")
    data: dict = json.loads(raw)

    posts_data: list[dict] = data.get("posts", [])
    drafts_data: list[dict] = data.get("drafts", [])
    reviews_data: list[dict] = data.get("reviews", [])

    db = SessionLocal()
    try:
        # ----------------------------------------------------------------
        # Wipe in FK-safe order (reviews → drafts → posts)
        # ----------------------------------------------------------------
        deleted_reviews = db.query(Review).delete()
        deleted_drafts = db.query(DraftComment).delete()
        deleted_posts = db.query(Post).delete()
        db.commit()
        if deleted_posts:
            print(
                f"Cleared existing data: "
                f"{deleted_posts} posts, {deleted_drafts} drafts, {deleted_reviews} reviews"
            )

        # ----------------------------------------------------------------
        # Posts
        # ----------------------------------------------------------------
        for p in posts_data:
            post = Post(
                id=p["id"],
                platform=p["platform"],
                subreddit=p.get("subreddit"),
                author=p["author"],
                title=p.get("title"),
                body=p["body"],
                url=p.get("url"),
                upvotes=p.get("upvotes", 0),
                comment_count=p.get("comment_count", 0),
                created_at=_parse_dt(p["created_at"]),
                ingested_at=_parse_dt(p.get("ingested_at")) or datetime.utcnow(),
                relevance_score=p.get("relevance_score"),
                relevance_reason=p.get("relevance_reason"),
                safety_status=p.get("safety_status", "pending"),
                safety_flags=json.dumps(p.get("safety_flags", [])),
                status=p.get("status", "pending"),
            )
            db.add(post)

        db.commit()
        print(f"Inserted {len(posts_data)} posts")

        # ----------------------------------------------------------------
        # Draft comments
        # ----------------------------------------------------------------
        for d in drafts_data:
            draft = DraftComment(
                id=d["id"],
                post_id=d["post_id"],
                draft_text=d["draft_text"],
                version=d.get("version", 1),
                created_at=_parse_dt(d.get("created_at")) or datetime.utcnow(),
            )
            db.add(draft)

        db.commit()
        print(f"Inserted {len(drafts_data)} draft comments")

        # ----------------------------------------------------------------
        # Reviews
        # ----------------------------------------------------------------
        for r in reviews_data:
            review = Review(
                id=r["id"],
                post_id=r["post_id"],
                draft_id=r["draft_id"],
                decision=r["decision"],
                edited_text=r.get("edited_text"),
                reviewer_notes=r.get("reviewer_notes"),
                reviewed_at=_parse_dt(r.get("reviewed_at")) or datetime.utcnow(),
            )
            db.add(review)

        db.commit()
        print(f"Inserted {len(reviews_data)} reviews")

        # ----------------------------------------------------------------
        # Summary
        # ----------------------------------------------------------------
        total_posts = db.query(Post).count()
        total_drafts = db.query(DraftComment).count()
        total_reviews = db.query(Review).count()
        blocked = db.query(Post).filter(Post.safety_status == "blocked").count()
        flagged = db.query(Post).filter(Post.safety_status == "flagged").count()
        safe = db.query(Post).filter(Post.safety_status == "safe").count()
        reviewed = db.query(Post).filter(Post.status == "reviewed").count()
        skipped = db.query(Post).filter(Post.status == "skipped").count()
        pending = db.query(Post).filter(Post.status == "pending").count()

        sep = "-" * 42
        print()
        print(sep)
        print("  Database summary")
        print(sep)
        print(f"  Posts   : {total_posts:>4}  (safe={safe}, flagged={flagged}, blocked={blocked})")
        print(f"  Status  :        reviewed={reviewed}, skipped={skipped}, pending={pending}")
        print(f"  Drafts  : {total_drafts:>4}")
        print(f"  Reviews : {total_reviews:>4}")
        print(sep)
        db_path = PROJECT_ROOT / "sonia_comments.db"
        print(f"  DB file : {db_path}")
        print(sep)
        print("  Seed complete.")

    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
