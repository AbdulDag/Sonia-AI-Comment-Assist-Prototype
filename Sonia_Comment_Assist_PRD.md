# Sonia Comment-Assist System — Product Requirements Document

## Context & Growth Rationale

The consumer-first mental health market is a bloodbath. Sonia competes directly with Youper, Rosebud, Earkick, and others for the same users. Most of these competitors are glorified mood trackers — Sonia has a real differentiator: proven GAD-7 clinical reductions after just 2 weeks of use.

But a superior product means nothing if nobody finds it. The goal isn't to spam the internet — it's to show up in the right conversations, at the right time, with something genuinely helpful to say.

This tool helps Sonia's growth team do that at scale without compromising trust.

---

## What We're Building

A lightweight internal web app that:

1. **Sources** relevant public posts from Reddit, TikTok comments, and creator content where people are discussing anxiety, loneliness, therapy access, and emotional support
2. **Scores** each post for relevance and safety
3. **Drafts** thoughtful, human-sounding comments for each post
4. **Lets a human reviewer** approve, edit, reject, or flag each comment before anything goes live

The human is always in the loop. Nothing gets posted automatically.

---

## Target Platforms & Post Sources

### Primary: Reddit
- **Why:** Highest-intent users. People writing paragraphs about their anxiety at 2am are actively seeking help.
- **Subreddits:** r/anxiety, r/depression, r/mentalhealth, r/selfimprovement, r/therapyquestions, r/college, r/getdisciplined, r/decidingtobebetter
- **Method:** Reddit's public JSON API (append `.json` to any subreddit URL — no auth required for public data)

### Secondary: Mock TikTok/Instagram data
- **Why:** TikTok and Instagram APIs are restricted. Scraping violates TOS.
- **Method:** Realistic mock dataset based on real public trends and comment patterns. Clearly labeled as mock data in the README.
- **Production note:** In a real deployment, would use official TikTok Creator Marketplace API or manual sourcing + import

### Stretch: Mental health forums, Discord public channels, newsletter comment sections
- **Method:** Mock data for prototype, production would require case-by-case integration

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    FRONTEND                          │
│              React + Tailwind CSS                    │
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────┐  │
│  │ Post Feed│  │ Review   │  │ Analytics/Stats   │  │
│  │ + Scores │  │ Queue    │  │ Dashboard         │  │
│  └──────────┘  └──────────┘  └───────────────────┘  │
└──────────────────┬──────────────────────────────────┘
                   │ REST API
┌──────────────────┴──────────────────────────────────┐
│                    BACKEND                           │
│              FastAPI (Python)                         │
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────┐  │
│  │ Ingestion│  │ AI       │  │ Review            │  │
│  │ Pipeline │  │ Pipeline │  │ Endpoints         │  │
│  └──────────┘  └──────────┘  └───────────────────┘  │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────┴──────────────────────────────────┐
│                    DATA                              │
│              SQLite (local)                           │
│                                                      │
│  Posts │ Comments │ Reviews │ Safety Flags            │
└─────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Frontend | React + Tailwind | Fast to build, clean UI, meets assignment requirements |
| Backend | FastAPI (Python) | Lightweight, async, easy to set up |
| Database | SQLite | Zero config, runs locally, easy to inspect |
| LLM | Claude API (claude-sonnet-4-20250514) | Best balance of quality and cost for comment drafting |
| Scraping | Reddit public JSON API + mock data | No auth needed, respects TOS |

---

## Data Model

### Posts Table
```
id              TEXT PRIMARY KEY
platform        TEXT (reddit / tiktok / instagram / mock)
subreddit       TEXT (nullable)
author          TEXT
title           TEXT (nullable — reddit has titles, comments don't)
body            TEXT
url             TEXT
upvotes         INTEGER
comment_count   INTEGER
created_at      DATETIME
ingested_at     DATETIME
relevance_score FLOAT (0.0 - 1.0)
safety_status   TEXT (safe / flagged / blocked)
safety_flags    TEXT (JSON array of flag reasons)
status          TEXT (pending / reviewed / skipped)
```

### Draft Comments Table
```
id              TEXT PRIMARY KEY
post_id         TEXT FOREIGN KEY
draft_text      TEXT
version         INTEGER (supports regeneration)
created_at      DATETIME
```

### Reviews Table
```
id              TEXT PRIMARY KEY
post_id         TEXT FOREIGN KEY
draft_id        TEXT FOREIGN KEY
decision        TEXT (approved / edited / rejected / flagged_unsafe)
edited_text     TEXT (nullable — only if edited)
reviewer_notes  TEXT (nullable)
reviewed_at     DATETIME
```

---

## AI Pipeline

### Step 1: Relevance Scoring

Each ingested post gets scored 0.0 to 1.0 based on:

| Signal | Weight | Rationale |
|--------|--------|-----------|
| Mentions anxiety, stress, overwhelm, loneliness, therapy access, can't afford therapy | High | Direct Sonia use case |
| Asking for recommendations or alternatives | High | High purchase intent |
| Self-improvement, journaling, mindfulness discussion | Medium | Adjacent interest |
| General mental health news/debate | Low | Not actionable |
| Mentions specific competitor (Wysa, Woebot, BetterHelp, Headspace) + complaint | Very High | Competitor displacement opportunity |

**LLM Prompt Strategy:**

```
System: You are a relevance scorer for Sonia, an AI emotional support 
and life coaching app. Score each post from 0.0 to 1.0 based on how 
relevant it is for Sonia's growth team to engage with.

High relevance (0.7-1.0): User is actively seeking emotional support, 
can't afford therapy, asking for app recommendations, or expressing 
frustration with a competitor.

Medium relevance (0.4-0.6): User discussing self-improvement, 
journaling, mindfulness, or general mental wellness.

Low relevance (0.0-0.3): General mental health news, academic 
discussion, or not actionable.

Return JSON: { "score": float, "reason": string }
```

### Step 2: Safety Filter (CRITICAL)

Before any comment is drafted, every post is screened. Posts are **blocked** or **flagged** if they contain:

| Flag | Action | Why |
|------|--------|-----|
| Active crisis / suicidal ideation | **BLOCK** — never engage | Sonia is not a crisis tool. Engagement could cause harm. |
| Mentions being a minor / school age indicators | **BLOCK** | Marketing to minors is a liability |
| Requests for diagnosis or medical advice | **FLAG** | Sonia is wellness, not medical device |
| Active self-harm description | **BLOCK** | Not appropriate for brand engagement |
| Legal / custody / abuse situations | **BLOCK** | Too sensitive for a comment |
| Grief within recent loss | **FLAG** | Requires extreme care, reviewer decides |
| Privacy-sensitive (names, locations, specific therapists) | **FLAG** | Don't reference their private details |

**LLM Prompt Strategy:**

```
System: You are a safety classifier for Sonia, a general wellness app 
(NOT a medical device). Analyze this post for safety risks.

Return JSON:
{
  "safe": boolean,
  "action": "allow" | "flag" | "block",
  "flags": ["crisis", "minor", "medical_claim", "self_harm", 
            "legal", "grief", "privacy"],
  "reason": string
}

Be conservative. When in doubt, flag for human review.
```

### Step 3: Comment Drafting

Only for posts that pass safety (safe or flagged-but-reviewer-approved).

**Comment Principles:**
- Specific to what the person actually said — not generic
- Empathetic and warm — not corporate
- Short (2-4 sentences max) — plausible as a real comment
- Transparent about Sonia if mentioned — "I've been using an app called Sonia" not "check out this amazing app!!!"
- Never claims Sonia treats, diagnoses, or cures anything
- Never pressures or uses fear-based language
- Offers perspective, not a sales pitch

**LLM Prompt Strategy:**

```
System: You are drafting a comment for Sonia's growth team to review 
before posting. The comment should feel like it's from a real person 
who genuinely found Sonia helpful.

Rules:
- Be specific to the post content
- 2-4 sentences max
- Warm and human, not corporate
- If mentioning Sonia, be transparent ("I've been using an app called 
  Sonia for a few weeks")
- NEVER claim Sonia treats, diagnoses, or cures anything
- NEVER use fear-based or manipulative language
- NEVER target vulnerable moments with sales pressure
- Frame as sharing a personal experience, not advertising
- Include a natural reason why you're sharing

Post: {post_content}
```


---

## Frontend — Reviewer UI

### Views

**1. Post Feed (Main View)**
- List of ingested posts sorted by relevance score (highest first)
- Each card shows: platform icon, subreddit/source, title, body preview, relevance score badge, safety status badge
- Filter by: platform, safety status, review status, relevance threshold
- Search by keyword

**2. Post Detail + Review Panel**
- Full post content + metadata
- Relevance score + reasoning
- Safety flags (if any) highlighted clearly
- Draft comment displayed in editable text area
- Action buttons: Approve / Edit & Approve / Reject / Flag Unsafe
- Optional reviewer notes field
- "Regenerate Comment" button for a fresh draft
- Previous review history if post was revisited

**3. Dashboard (Stretch)**
- Posts ingested today / this week
- Posts reviewed vs pending
- Approval rate
- Most common safety flags
- Top subreddits by relevance
- Average relevance score trend

### UX Priorities
- Keyboard shortcuts for fast reviewing (A = approve, R = reject, E = edit, F = flag)
- Clear visual distinction between safe / flagged / blocked posts
- Never show blocked posts in the default feed — separate "blocked" tab for audit purposes
- Mobile-responsive is not required — this is an internal tool

---

## API Endpoints

```
GET    /api/posts                    — List posts (filterable, paginated)
GET    /api/posts/{id}               — Single post with drafts and reviews
POST   /api/posts/ingest             — Trigger ingestion from Reddit
POST   /api/posts/{id}/draft         — Generate or regenerate a comment draft
POST   /api/posts/{id}/review        — Submit a review decision
GET    /api/stats                    — Dashboard stats
GET    /api/posts/export             — Export reviewed posts as CSV
```

---

## Demo Dataset (20+ Posts)

Build a mixed dataset:

| Source | Count | Type |
|--------|-------|------|
| Real Reddit posts (public, linked) | 10 | Scraped via JSON API from r/anxiety, r/mentalhealth |
| Mock TikTok/Instagram comments | 5 | Based on real trends, clearly labeled mock |
| Mock competitor complaint posts | 3 | Based on real 1-2 star reviews of Wysa/Woebot |
| Safety edge cases | 4 | Crisis, minor, medical claim, grief — to demo the safety filter |

Each post should have:
- Generated relevance score + reasoning
- Safety classification
- At least one draft comment
- 2-3 posts should have sample reviewer decisions pre-filled

---

## Production Roadmap (What I'd Build Next)

If this became real production software:

1. **Scheduled ingestion** — Cron job pulling from Reddit every 6 hours, not manual trigger
2. **Multi-platform expansion** — TikTok Creator Marketplace API, Twitter/X API for quote-tweet opportunities
3. **Comment performance tracking** — After posting, track engagement (upvotes, replies) to learn which comment styles work
4. **Reviewer leaderboard** — Track speed and consistency across team members
5. **A/B testing comment styles** — Run different tones/formats and measure which converts
6. **Creator sourcing integration** — Same pipeline but for finding micro-influencers to partner with, not just conversations to comment on
7. **CRM integration** — Feed high-value community partnerships into a proper outreach pipeline
8. **Slack/Discord alerts** — Notify team when a high-relevance post drops

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Perceived as spam or astroturfing | High | Human always reviews. Comments are transparent. Never post more than 2-3 per day per subreddit. |
| Engaging with crisis content | Critical | Hard-block in safety filter. Never engage with suicidal or self-harm posts. |
| Targeting minors | Critical | Block posts from school-age indicators. Never engage with r/teenagers or similar. |
| Medical overclaiming | High | LLM instructions explicitly prohibit diagnosis/treatment language. Reviewer training doc included. |
| Reddit community backlash / mod bans | Medium | Keep volume low. Contribute genuinely to communities (not just Sonia mentions). Vary accounts. |
| Platform TOS violations | Medium | Only use public APIs. No scraping of private data. Mock non-API platforms. |
| Undisclosed affiliation | High | All comments that mention Sonia should be from accounts that are transparently affiliated. |
| LLM hallucination in comments | Medium | Human review catches this. Never auto-post. |
| Over-reliance on tool replacing human judgment | Medium | Tool is an assistant, not a replacement. Dashboard tracks reviewer engagement. |

---

## File Structure

```
sonia-comment-assist/
├── README.md
├── .env.example
├── requirements.txt
├── package.json
│
├── backend/
│   ├── main.py                 # FastAPI app entry
│   ├── config.py               # Environment + settings
│   ├── database.py             # SQLite setup + models
│   ├── routers/
│   │   ├── posts.py            # Post CRUD + ingestion
│   │   ├── drafts.py           # Comment generation
│   │   ├── reviews.py          # Review decisions
│   │   └── stats.py            # Dashboard data
│   ├── services/
│   │   ├── ingestion.py        # Reddit fetcher + mock loader
│   │   ├── relevance.py        # LLM relevance scoring
│   │   ├── safety.py           # LLM safety classifier
│   │   └── drafting.py         # LLM comment drafter
│   ├── data/
│   │   ├── mock_posts.json     # Mock TikTok/Instagram posts
│   │   └── seed.py             # Seed script to populate DB
│   └── prompts/
│       ├── relevance.txt       # Relevance scoring prompt
│       ├── safety.txt          # Safety classification prompt
│       └── drafting.txt        # Comment drafting prompt
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── PostFeed.jsx
│   │   │   ├── PostCard.jsx
│   │   │   ├── ReviewPanel.jsx
│   │   │   ├── SafetyBadge.jsx
│   │   │   ├── RelevanceBadge.jsx
│   │   │   ├── StatsBar.jsx
│   │   │   └── FilterBar.jsx
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   └── PostDetail.jsx
│   │   └── utils/
│   │       └── api.js
│   └── tailwind.config.js
│
└── docs/
    ├── approach.md             # Required approach document
    └── screenshots/            # Demo screenshots
```

---

## Build Order (Execution Plan)

### Phase 1: Data Layer (2-3 hours)
1. Set up FastAPI project + SQLite
2. Define models
3. Build ingestion service (Reddit JSON API)
4. Create mock dataset (TikTok/Instagram/edge cases)
5. Seed script to populate DB

### Phase 2: AI Pipeline (3-4 hours)
1. Relevance scoring with Claude API
2. Safety classifier with Claude API
3. Comment drafter with Claude API
4. Process all 20+ posts through pipeline
5. Verify edge cases (crisis, minor, medical) are properly blocked/flagged

### Phase 3: Backend API (2-3 hours)
1. Post listing + filtering endpoints
2. Single post detail endpoint
3. Review submission endpoint
4. Stats endpoint
5. Export endpoint

### Phase 4: Frontend (4-5 hours)
1. Post feed with cards, scores, badges
2. Filter/search bar
3. Review panel with approve/edit/reject/flag
4. Keyboard shortcuts
5. Basic stats bar
6. Polish UI — make it feel like a real internal tool

### Phase 5: Documentation + Polish (2-3 hours)
1. README with setup instructions
2. .env.example
3. Approach document (in own words)
4. Screenshots or Loom walkthrough
5. AI/work log
6. Final testing — make sure it runs from a fresh clone

**Total estimated: 13-18 hours**

---

## Environment Variables

```
ANTHROPIC_API_KEY=your_key_here
REDDIT_SUBREDDITS=anxiety,mentalhealth,selfimprovement,therapyquestions
RELEVANCE_THRESHOLD=0.4
DATABASE_PATH=./sonia_comments.db
```

---

## Success Criteria

The submission is strong if:
- [ ] App runs from a fresh `git clone` with clear setup instructions
- [ ] 20+ posts displayed with real relevance scores and safety classifications
- [ ] Safety filter correctly blocks crisis/minor/medical posts
- [ ] Comments sound human, specific, and non-spammy
- [ ] Reviewer can approve/edit/reject/flag with minimal friction
- [ ] Approach document shows growth thinking, not just engineering thinking
- [ ] Code is clean enough that another person could extend it
