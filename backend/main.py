"""
Sonia Comment-Assist — FastAPI application entry point.

Run with:
    uvicorn backend.main:app --reload

Interactive API docs:
    http://localhost:8000/docs
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.database import init_db
from backend.routers import drafts, posts, reviews, stats

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s — %(message)s",
    datefmt="%H:%M:%S",
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create all database tables on startup (idempotent)."""
    init_db()
    yield


app = FastAPI(
    title="Sonia Comment-Assist API",
    description=(
        "Internal growth tool for AI-assisted social comment drafting and review. "
        "Human reviewers approve, edit, reject, or flag every comment before anything goes live."
    ),
    version="0.1.0",
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# CORS — allow the React dev server to connect
# ---------------------------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------

app.include_router(posts.router)
app.include_router(drafts.router)
app.include_router(reviews.router)
app.include_router(stats.router)


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------


@app.get("/health", tags=["health"])
def health() -> dict:
    return {"status": "ok"}
