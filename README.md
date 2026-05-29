# Sonia Comment-Assist

An internal growth tool for Sonia's team. It ingests realistic mock data for platforms, runs each post through an AI-powered relevance and safety pipeline, drafts a candidate comment via Claude, and queues everything for human review before anything goes live.

**Nothing is ever posted automatically.** A human reviewer approves, edits, rejects, or flags every comment.

---

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- An [Anthropic API key](https://console.anthropic.com/)

### 1. Clone and set up the backend

```bash
# Install Python dependencies
pip install -r requirements.txt

# Copy and fill in environment variables
# Mac/Linux
cp .env.example .env

# Windows
copy .env.example .env
# Edit .env — at minimum set ANTHROPIC_API_KEY
```

### 2. Seed the database

The seed script loads all 23 mock posts, pre-computed relevance scores, safety classifications, draft comments, and sample review decisions in one step. No API calls needed.

```bash
python backend/data/seed.py
```

You should see a summary table confirming the insert counts.

### 3. Start the backend

```bash
uvicorn backend.main:app --reload
```

API runs at `http://localhost:8000`. Interactive docs at `http://localhost:8000/docs`.

### 4. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

UI runs at `http://localhost:5173`.

### Set up with an AI assistant

If you'd rather hand this off to Claude Code or any other coding agent, paste the prompt below into a fresh conversation with the repo open:

````
Set up the Sonia Comment-Assist project so it runs locally end-to-end. Here is everything you need to know:

**Stack**
- Backend: FastAPI + SQLite via SQLAlchemy, Python 3.11+
- Frontend: React 18 + Tailwind CSS, Node 18+, Vite dev server
- AI: Anthropic Python SDK (claude-sonnet-4-20250514)

**Steps to complete**
1. Install Python dependencies: `pip install -r requirements.txt`
2. Create a `.env` file by copying `.env.example`. Set `ANTHROPIC_API_KEY` to the key I will provide. Leave all other variables at their defaults unless I say otherwise.
3. Seed the SQLite database with the pre-built mock dataset: `python backend/data/seed.py`. This is idempotent — safe to run multiple times.
4. Start the FastAPI backend: `uvicorn backend.main:app --reload` (port 8000)
5. In a second terminal, install frontend dependencies and start the dev server: `cd frontend && npm install && npm run dev` (port 5173)
6. Confirm both services are healthy:
   - Backend: GET http://localhost:8000/health should return `{"status":"ok"}`
   - Frontend: http://localhost:5173 should load the Sonia Comment-Assist UI

**Key file locations**
- Environment config: `backend/config.py` (Pydantic Settings, reads from `.env`)
- Database models: `backend/models.py` (Post, DraftComment, Review)
- API routes: `backend/routers/` (posts, drafts, reviews, stats)
- AI services: `backend/services/` (relevance.py, safety.py, drafting.py)
- LLM prompts: `backend/prompts/` (plain text files)
- Mock dataset: `backend/data/mock_posts.json`
- Frontend entry: `frontend/src/main.jsx`
- API client: `frontend/src/utils/api.js`

**What not to change**
The database schema (table names, column names) and the Pydantic schema shapes in `backend/schemas.py` are treated as a contract by the frontend. Do not rename or restructure them without updating both sides.

**Ingest fresh posts (optional)**
Once the app is running, clicking "Ingest Posts" in the UI (or POST /api/posts/ingest) will pull new posts from Reddit's public JSON API and run them through the AI pipeline. This makes live Claude API calls and counts against the API key.

Tell me when both servers are running and the health check passes.
````

---

## Environment Variables

Copy `.env.example` to `.env` and fill in the values:

```env
# Required
ANTHROPIC_API_KEY=sk-ant-...

# Optional — defaults shown
REDDIT_SUBREDDITS=anxiety,mentalhealth,selfimprovement,therapyquestions,college,getdisciplined,decidingtobebetter
RELEVANCE_THRESHOLD=0.4
DATABASE_PATH=./sonia_comments.db
```

| Variable | Default | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | — | **Required.** Your Anthropic API key. |
| `REDDIT_SUBREDDITS` | See above | Comma-separated subreddits to pull from when ingesting. |
| `RELEVANCE_THRESHOLD` | `0.4` | Posts below this score are de-prioritised in the feed. |
| `DATABASE_PATH` | `./sonia_comments.db` | Path to the SQLite file. Created automatically on first run. |

---

## How to Ingest Fresh Posts

The database starts pre-seeded. To pull new posts through the AI pipeline:

1. Click **Ingest Posts** in the top-right corner of the UI, or
2. Call the API directly:

```bash
curl -X POST http://localhost:8000/api/posts/ingest
```

Each new post is scored for relevance, classified for safety, and written to the database. Posts already in the database are skipped (idempotent).

**Reddit** is the only live data source. TikTok, Instagram, and competitor review posts are mock data (see note below on why).

---

## Architecture

```
┌──────────────────────────────────────────────────────┐
│  Frontend (React + Tailwind, port 5173)               │
│  PostFeed · ReviewPanel · FilterBar · StatsBar        │
└───────────────────┬──────────────────────────────────┘
                    │ REST (Vite proxy → :8000)
┌───────────────────┴──────────────────────────────────┐
│  Backend (FastAPI, port 8000)                         │
│                                                       │
│  routers/                                             │
│    posts.py    — list, detail, ingest, export, safety │
│    drafts.py   — generate/regenerate via Claude       │
│    reviews.py  — submit reviewer decisions            │
│    stats.py    — dashboard aggregates                 │
│                                                       │
│  services/                                            │
│    relevance.py  — Claude scores 0.0–1.0              │
│    safety.py     — Claude classifies allow/flag/block │
│    drafting.py   — Claude writes the comment          │
└───────────────────┬──────────────────────────────────┘
                    │ SQLAlchemy
┌───────────────────┴──────────────────────────────────┐
│  SQLite (sonia_comments.db)                           │
│  posts · draft_comments · reviews                     │
└──────────────────────────────────────────────────────┘
```

### AI pipeline

Every ingested post passes through three sequential Claude calls:

1. **Relevance scoring** — returns a 0.0–1.0 score and a one-sentence reason. Posts below the `RELEVANCE_THRESHOLD` remain in the database but are filtered from the default feed view.

2. **Safety classification** — returns `allow`, `flag`, or `block`. Blocked posts (active crisis, minors, self-harm, legal situations) never receive a draft and are hidden from the main feed. Flagged posts (medical claims, recent grief, privacy concerns) surface for human judgement. Safety is the highest-priority concern; the classifier is instructed to err on the side of flagging when uncertain.

3. **Comment drafting** — only runs for posts that passed safety. Produces a 2–4 sentence comment written from the perspective of a genuine Sonia user. The system prompt hard-bans diagnostic language, fear-based framing, and any claim that Sonia treats or replaces professional care.

JSON responses from Claude are enforced via assistant prefilling (the model is forced to begin its reply with `{`) and retried once on parse failure.

### Frontend reviewer workflow

- **Post feed** — sorted by relevance score, filterable by platform, safety status, and review status.
- **Detail / review panel** — two-column layout. Left: full post context, relevance reasoning, safety flags. Right (sticky): draft textarea, reviewer notes, steering prompt for regeneration, action buttons.
- **Keyboard shortcuts** — `A` approve, `R` reject, `E` focus draft, `F` flag unsafe, `Esc` back to feed.
- **Safety override** — reviewers can manually promote or demote any post's safety classification via a dropdown on the detail page.

---

## Production Roadmap (Changes to be made for production)

- **SQLite → PostgreSQL:** One-line swap in `database.py`. Handles concurrent writers and gives every decision a reviewer ID for audit trails.
- **No auth → OAuth login:** Each reviewer logs in; every approve/reject/flag is attributed. Required for compliance in a wellness context.
- **Reddit public API → OAuth + streaming:** Current setup is unauthenticated and manual. Production uses a registered Reddit OAuth app with scheduled streaming jobs.
- **TikTok/Instagram mock data → Creator APIs:** Scraping violates ToS. Mock posts simulate comment sections on mental health creator content — the highest-intent surface. Production path is TikTok Creator Marketplace API and Meta's Graph API.
- **Synchronous ingestion → async worker queue:** Ingestion currently blocks the browser. Celery + Redis moves it to the background so the API returns immediately.
- **Manual feed refresh → WebSockets:** Two reviewers can currently pick up the same post. WebSockets push approvals in real time so posts vanish from the queue instantly.
- **Steering field → input sanitisation:** Freeform reviewer input appends directly to the Claude system prompt. In production, scope it to tone/length only so it can't override safety instructions.
- **No comment history → subreddit context window:** Claude drafts in isolation. Passing recent approved drafts per subreddit prevents repeated phrasing — the clearest signal of bot activity.
- **Generic AI tone → few-shot prompting:** Inject 3–5 previously approved high-performing comments into the prompt context so the model writes like a real person, not a script.

---

## Project Structure

```
backend/
  main.py          config.py        database.py      models.py
  schemas.py
  routers/         posts · drafts · reviews · stats
  services/        relevance · safety · drafting
  prompts/         relevance.txt · safety.txt · drafting.txt
  data/            mock_posts.json · seed.py

frontend/src/
  pages/           Dashboard · PostDetail
  components/      PostFeed · PostCard · ReviewPanel · FilterBar · StatsBar
  utils/           api.js
```

---

## API Reference

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/posts` | List posts — filterable by platform, safety, status |
| `GET` | `/api/posts/{id}` | Single post with drafts and review history |
| `POST` | `/api/posts/ingest` | Run ingestion pipeline |
| `POST` | `/api/posts/{id}/draft` | Generate or regenerate a comment draft |
| `POST` | `/api/posts/{id}/review` | Submit a review decision |
| `PATCH` | `/api/posts/{id}/safety` | Override safety classification |
| `GET` | `/api/posts/export` | Download all posts as CSV |
| `GET` | `/api/stats` | Dashboard metrics |

Once the backend is running, FastAPI's auto-generated interactive docs are at `http://localhost:8000/docs`.
