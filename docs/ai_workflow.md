(1) Create the project folder and file structure from the PRD first, just empty files


(2) Act as a Data Engineer. Based on the provided PRD, build the complete data layer inside a backend/ directory.

Create database.py to handle the SQLite connection via SQLAlchemy.

Create models.py defining the SQLAlchemy models for the posts, draft_comments, and reviews tables exactly as structured in the PRD data model.

Provide a seed.py script that reads a local mock_posts.json and populates the database with the sample posts.

Ensure all data types match perfectly. Do not write any backend API endpoints yet, focus strictly on the data layer.



(3) Act as an AI Integration Engineer. The Data Layer (Phase 1) is complete. Based on the PRD, build out Phase 2: the AI Pipeline inside the backend/services/ directory.

Use the official Anthropic Python SDK and the claude-3-5-sonnet-20241022 model. You must strictly enforce JSON outputs from the LLM for the relevance and safety functions.

Implement backend/services/relevance.py: Create a function that takes a post's content and returns a parsed JSON dictionary with a float score (0.0 to 1.0) and a string reason. Use the relevance prompt from the PRD.

Implement backend/services/safety.py: Create a function that takes a post's content and returns a parsed JSON dictionary with a boolean safe, string action (allow/flag/block), list of strings flags, and a string reason. Use the safety prompt from the PRD.

Implement backend/services/drafting.py: Create a function that takes safe post content and returns a drafted comment (plain text). Strictly enforce the 2-4 sentence constraint and the rules against medical claims or manipulative language from the PRD.

Read the system prompts from the PRD or read them from backend/prompts/ if you prefer to write them to text files first. Do not write any FastAPI router endpoints yet."


(4) (noticed claude wrote down incossistent model strings)
Update the model string across the entire backend. In these three files:
- backend/services/relevance.py
- backend/services/safety.py  
- backend/services/drafting.py

Change MODEL = "claude-3-5-sonnet-20241022" to MODEL = "claude-sonnet-4-20250514"

Also in .cursorrules, update the line that says "claude-3-5-sonnet-20241022" to "claude-sonnet-4-20250514"


(5). Act as a Backend API Engineer. Phase 1 (Data Layer) and Phase 2 (AI Pipeline) are completely functional. Based on the PRD, implement Phase 3 by writing the FastAPI routers and wiring them into main.py.

Create backend/routers/posts.py: Implement the paginated/filterable GET endpoint for posts, a single post detail endpoint, and a /api/posts/ingest endpoint that runs a batch processing loop (grabs posts, passes them through the relevance and safety services, and saves the results to the SQLite DB).

Create backend/routers/drafts.py: Implement the POST endpoint to generate or regenerate a comment draft using the drafting service.

Create backend/routers/reviews.py: Implement the POST endpoint to submit a reviewer decision (approved, edited, rejected, flagged_unsafe) and update the statuses in the DB.

Create backend/routers/stats.py: Implement the dashboard stats endpoint.

Update backend/main.py: Include all routers and configure CORS middleware to allow connection from the React frontend (http://localhost:5173).

Rely strictly on the SQLAlchemy models from Phase 1 and the exported services from Phase 2. Ensure clean Pydantic request/response schemas are defined in backend/schemas.py.


(6) Act as a Frontend Architect. We are building the React + Tailwind frontend for the Sonia Comment-Assist internal tool. We will do this in phases.

EXECUTE PHASE 1: Foundation & Data Layer

1. Brand & Design System (via Impeccable):
Use your Impeccable design skills to establish the foundation. Scan the @[www.soniahealth.com](https://www.soniahealth.com) folder. Use /impeccable teach to extract their brand tokens (warm creams, charcoal text, serif headings, soft watercolor blobs) and establish a production-grade Tailwind configuration. Rely on Impeccable's standards: use OKLCH colors, fluid typography, and ensure you tint all neutrals. Do not use generic system fonts.

2. API Wrapper (frontend/src/utils/api.js):
Write standard fetch/axios wrappers for these backend endpoints (http://localhost:8000):

GET /api/posts (accepts filters: platform, safety_status, status)

GET /api/posts/{id}

POST /api/posts/{id}/draft

POST /api/posts/{id}/review

GET /api/stats

POST /api/posts/ingest

3. Global Layout (frontend/src/App.jsx):
Use /impeccable shape to plan and build the main application shell. Implement the background aesthetic: 2-3 soft, organic blob shapes with smooth easing and low opacity, mimicking the watercolor leaf effect from the Sonia hero section. Setup the basic React Router layout structure.

Focus strictly on a perfect brand foundation and API wiring. Do not build the Dashboard or Review Panel components yet."


(7) Act as a Frontend Engineer and UI Designer equipped with the Impeccable design framework. Phase 1 is complete. We are now executing Phase 2: The Dashboard & Feed (Read-Only UI).

EXECUTE PHASE 2: The Dashboard & Feed

1. Impeccable Design Application:
Apply Impeccable design principles  using the claude skill throughout (tinted neutrals, fluid typography, soft visual hierarchy). Do not use generic cards with harsh borders; use soft elevations/shadows and subtle glassmorphism (backdrop-blur) for elements sitting over the background blobs.

2. Build the Dashboard Elements:

frontend/src/pages/Dashboard.jsx: The main layout integrating the components below. Include the top Navbar here with the Sonia 'S' logo, 'Comment Assist' label, and an 'Ingest Posts' button.

frontend/src/components/StatsBar.jsx: Display Total Posts, Pending, Reviewed, Approval Rate, and Avg Relevance. Separate them using soft, organic dividers (e.g., subtle tinted dots or soft vertical gradients), not harsh lines.

frontend/src/components/FilterBar.jsx: Include platform pills (All/Reddit/TikTok/Instagram/Mock), safety status tabs (Safe/Flagged/Blocked), and a search input. Match the dark, rounded pill aesthetic for active states.

frontend/src/components/PostCard.jsx: A clickable card showing:

Platform icon (use lucide-react) + source/author + timestamp.

Title + body preview (truncated to exactly 3 lines).

Relevance score badge: Color-code using Impeccable's subtle color blending (soft green background for 0.7+, soft yellow for 0.4-0.7, tinted gray below). This must feel like a gentle signal, not a harsh alert.

Safety badge (soft green=safe, soft amber=flagged, soft red=blocked).

Review status chip.

frontend/src/components/PostFeed.jsx: The list container mapping the PostCard components.

3. Data Wiring & State:

Connect to your api.js to fetch /api/posts and /api/stats on mount and when filters change.

Connect the 'Ingest Posts' button to trigger the ingest endpoint and refresh the feed.

Implement loading skeletons using a soft, cream-colored pulse animation (never a stark generic gray).

Implement a warm, empathetic empty state (e.g., 'No posts match these filters — try adjusting your view' or 'All caught up! Try ingesting new posts.').

CRITICAL RULE: Do not use // TODO placeholders. Write the complete, functional React mapping and state logic. Do not build the Review Panel or draft generation logic yet."

Once this generates, spin up your Vite dev server (npm run dev) and take a look. You should see a gorgeous, wellness-focused feed populating with the mock data we ingested earlier! Let me know if the aesthetic hits the mark or if we need to tweak the CSS.

also change logo  and integrate @www.soniahealth.com/www.soniahealth.com/hero-bg.webp for the index page and @www.soniahealth.com/www.soniahealth.com/sonia-logo.svg favicon and company logo again ensure ur following fonts from @www.soniahealth.com/fonts.googleapis.com/css2.css 


(8) Act as a Frontend Engineer equipped with the Impeccable design claude skill framework. Phase 1 and Phase 2 are fully operational. We are now executing Phase 3: The Review Engine (Interactive UI).

EXECUTE PHASE 3: The Review Engine

1. Impeccable Design Context:
This is the execution workspace where human reviewers read sensitive mental health posts and approve AI comments. It must feel exceptionally calm, spacious, and readable. Apply fluid typography for the reading experience. Do not use standard harsh textareas or heavy borders; use warm, tinted cream backgrounds for input fields and subtle focus rings.

2. Build the Layout & Components:

frontend/src/pages/PostDetail.jsx (or a split-screen/drawer integrated into Dashboard): The wrapper for the review state.

frontend/src/components/ReviewPanel.jsx: The main workspace containing:

Post Context: Full post title and body text.

AI Context: Explicitly display the Relevance reasoning and highlight Safety Flags clearly (using soft tinted alert backgrounds, e.g., a gentle amber for flags, not a glaring red error box).

Draft Workspace: A spacious, editable textarea for the drafted comment. Include an optional 'Reviewer Notes' input below it.

Controls: A secondary 'Regenerate Draft' button.

Action Row: Four primary action buttons: Approve (dark pill), Edit & Approve, Reject, and Flag Unsafe. Include tiny visual hints for the keyboard shortcuts next to the button text (e.g., [A]).

History: A collapsed section showing previous drafts/reviews if available.

3. Data Wiring & Interactive State:

Wire up /api/posts/{id} to fetch full post context.

Wire up the Draft Generation: If no draft exists or if the user clicks 'Regenerate', call /api/posts/{id}/draft. Show a subtle, warm-tinted loading pulse while generating.

Wire up the Review Submission: Call /api/posts/{id}/review when an action button is clicked, mapping the decision appropriately (approved, edited, rejected, flagged_unsafe). On success, navigate back to the main feed or load the next pending post.

4. Keyboard Shortcuts (High-Speed Execution):
Implement a global useEffect keyboard listener when this panel is active:

A = Trigger Approve

R = Trigger Reject

E = Focus the draft textarea for editing

F = Trigger Flag Unsafe

Escape = Close the panel / return to feed
(Ensure shortcuts are disabled when the user is actively typing inside the textarea).

CRITICAL RULE: Write the complete, functional React logic for the keyboard listeners and API mutations. Do not use // TODO placeholders."


(9) In frontend/src/utils/api.js, the fetchPosts function never passes include_blocked=true to the backend, so blocked posts never appear even when the user selects the "Blocked" filter pill.

Fix: add this line inside fetchPosts before the return statement:

if (filters.safety_status === 'blocked') params.include_blocked = true

That's the only change needed. The backend already handles include_blocked correctly. 


(10) In backend/routers/posts.py, add a CSV export endpoint. 

Add these imports at the top of the file:
import csv
import io
from fastapi.responses import StreamingResponse

Then add this route BEFORE the /{post_id} route (important - it must come before that route or "export" will be treated as a path parameter):

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

The route order in the file should be: /export, then /ingest, then /{post_id}. Do not change anything else.


(11) "Act as a Full Stack Engineer equipped with the Impeccable claude skill design framework. The Phase 3 Review Engine is complete, but we need to implement Phase 3.5: Advanced Steering & Safety Overrides.

1. Feature: Draft Steering (Backend & Frontend)
We need the ability to give the LLM instructions when regenerating a draft.

Backend (backend/schemas.py & backend/routers/drafts.py): Update the draft generation endpoint to accept a POST body containing an optional steering_prompt string.

Backend (backend/services/drafting.py): Update the Claude API call. If a steering_prompt is provided, append it to the system instructions (e.g., 'The reviewer has requested the following adjustment: {steering_prompt}').

Frontend (frontend/src/utils/api.js): Update the draft function to pass this new payload.

Frontend (frontend/src/components/ReviewPanel.jsx): Transform the 'Regenerate draft' button into a small, elegant input field (placeholder: 'E.g., Make it shorter, sound more empathetic...') with a subtle 'Regenerate' icon button next to it. Use Impeccable styling: warm tinted background, soft focus ring, no harsh borders.

2. Feature: Manual Safety Overrides (Backend & Frontend)
Reviewers need to manually force a post's status to Safe, Flagged, or Blocked directly from the UI without submitting a drafted review.

Backend (backend/routers/posts.py): Create a new PATCH /api/posts/{post_id}/safety endpoint that accepts a payload of {"safety_status": "safe" | "flagged" | "blocked"} and updates the database record.

Frontend (frontend/src/utils/api.js): Add the fetch wrapper for this new PATCH endpoint.

Frontend (frontend/src/components/ReviewPanel.jsx or where the badge lives): Make the existing Safety Badge interactive. When clicked, it should open a small, beautifully styled popover or dropdown menu allowing the user to override the status (Safe, Flagged, Blocked). If changed, trigger the API call, update the local state, and immediately reflect the new color-coded badge.

CRITICAL RULE: Maintain the calm, professional aesthetic. Do not use standard HTML <select> dropdowns; build a custom, soft-shadow popover for the safety override. Do not use // TODO placeholders. Write the complete, functional code across the stack."


(12) Act as a Prompt Engineer. We need to completely rewrite the SYSTEM_PROMPT variable in backend/services/drafting.py (or wherever the main Claude prompt is stored) to fix 'Persona Drift' and tighten the output constraints.

Update the system instructions with these strict new rules:



The Persona: You are an empathetic community manager/advocate working directly for the Sonia team. You must explicitly state this connection (e.g., 'We built Sonia to...', 'I work on the team at Sonia, and...'). You must never pretend to be a third-party user or customer.

The Tone: Casual, transparent, and highly conversational. Sound like a real team member reaching out to help. Banned Words: Do not use overly dramatic or clinical therapist buzzwords (e.g., completely ban the words 'ambient dread', 'stressor', 'journey', 'delve', or 'navigating').

Length Constraints: You must be extremely concise. Limit every response to a maximum of 3 sentences. No fluff, no long-winded sympathy—just a quick validation of their frustration and a direct, helpful introduction to the app.

Rewrite the system prompt to reflect these new constraints exactly, and ensure the resulting Python code is perfectly formatted.



also no em dashes 

@drafting.txt (11-21) some of the guardails. 





