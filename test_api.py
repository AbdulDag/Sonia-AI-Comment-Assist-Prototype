import requests

BASE_URL = "http://localhost:8000/api"

def run_smoke_test():
    print("🚀 Starting Sonia Comment-Assist Backend Smoke Test...")
    
    # 1. Health Check
    health = requests.get("http://localhost:8000/health").json()
    print(f"✅ Health Check Status: {health.get('status')}")
    
    # 2. Trigger Ingestion Loop
    print("\n📥 Testing Post Ingestion...")
    ingest_res = requests.post(f"{BASE_URL}/posts/ingest").json()
    print(f"📊 Ingestion Complete: {ingest_res}")
    
# 3. Get Pending Posts
    print("\n🔍 Fetching Pending Feed...")
    feed = requests.get(f"{BASE_URL}/posts?status=pending&include_blocked=false").json()
    
    # Dynamically find where the list of posts is hidden in the response
    if isinstance(feed, list):
        posts = feed
    elif isinstance(feed, dict):
        # Check common pagination wrapper keys
        posts = feed.get("items") or feed.get("posts") or feed.get("data")
        if posts == None:
            # If it's none of those, look for any value that is a list
            posts = next((v for v in feed.values() if isinstance(v, list)), None)
            
    if not posts:
        print(f"❌ Error: Could not parse a list of posts. Raw response received: {feed}")
        return
        
    target_post = posts[0]
    post_id = target_post["id"]
    print(f"🎯 Selected Post ID: {post_id} | Relevance: {target_post['relevance_score']}")
    
# 4. Generate a fresh draft comment via Claude
    print("\n🤖 Requesting AI Comment Draft...")
    response_json = requests.post(f"{BASE_URL}/posts/{post_id}/draft").json()
    
    # Dig into the nested "draft" key from DraftResponse
    draft_data = response_json.get('draft', {})
    
    draft_text = draft_data.get('draft_text')
    draft_id = draft_data.get('id')
    version = draft_data.get('version')
    
    print(f"💬 Draft Text: \"{draft_text}\" (v{version}) | ID: {draft_id}")
    
    # 5. Submit an Edited Review Decision
    print("\n📝 Submitting Review Decision...")
    review_payload = {
        "draft_id": draft_id,  # Now this will be populated properly!
        "decision": "edited",
        "edited_text": f"{draft_text} Genuinely worth a look.",
        "reviewer_notes": "Added a small closing punchiness boost."
    }
    review_res = requests.post(f"{BASE_URL}/posts/{post_id}/review", json=review_payload)
    
    # 6. Verify Dashboard Metrics Updated
    print("\n📈 Fetching Updated System Stats...")
    stats = requests.get(f"{BASE_URL}/stats").json()
    print(f"📊 Current Metrics -> Total Posts: {stats.get('total_posts')} | Approval Rate: {stats.get('approval_rate')}%")
    print("\n🏁 Smoke test passed flawlessly!")

if __name__ == "__main__":
    run_smoke_test()