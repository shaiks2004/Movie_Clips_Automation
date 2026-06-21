import os
import time
import uuid
import threading
import requests
from datetime import datetime
from database.repositories.publish_repository import PublishRepository
from database.repositories.clip_repository import ClipRepository

# Resolve base clips folder directory safely
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CLIP_DIR = os.path.join(BASE_DIR, "clips")

def run_publisher():
    """
    Background loop that continuously polls the database for scheduled posts
    which are ready to be published.
    """
    print("[PUBLISHER] Background publisher worker thread started.")
    
    # Initialize repositories
    try:
        publish_repo = PublishRepository()
        clip_repo = ClipRepository()
    except Exception as init_err:
        print(f"[PUBLISHER] Initialization failed: {init_err}")
        return

    while True:
        try:
            # 1. Fetch any queued items that have reached their schedule time
            db = publish_repo.db
            now_utc = datetime.utcnow()
            
            pending_items = list(db["publish_queue"].find({
                "status": "queued",
                "schedule_time": {"$lte": now_utc}
            }))
            
            if pending_items:
                print(f"[PUBLISHER] Found {len(pending_items)} pending items to publish.")
                
            for item in pending_items:
                queue_id = item["queue_id"]
                clip_id = item["clip_id"]
                platform = item["platform"]
                
                # Fetch clip metadata to resolve exact file path
                clip = clip_repo.get_clip(clip_id)
                if not clip:
                    print(f"[PUBLISHER] Error: Clip meta document missing in database for ID: {clip_id}")
                    db["publish_queue"].update_one(
                        {"queue_id": queue_id},
                        {"$set": {"status": "error", "error": "Clip metadata not found in database.", "updated_at": datetime.utcnow().isoformat()}}
                    )
                    continue
                
                clip_filepath = os.path.join(CLIP_DIR, clip["filename"])
                if not os.path.exists(clip_filepath):
                    print(f"[PUBLISHER] Error: Video file not found on disk at: {clip_filepath}")
                    db["publish_queue"].update_one(
                        {"queue_id": queue_id},
                        {"$set": {"status": "error", "error": f"Video clip file not found on disk.", "updated_at": datetime.utcnow().isoformat()}}
                    )
                    continue
                
                # Update status to publishing so another process doesn't grab it
                db["publish_queue"].update_one(
                    {"queue_id": queue_id},
                    {"$set": {"status": "publishing", "updated_at": datetime.utcnow().isoformat()}}
                )
                print(f"[PUBLISHER] Publishing clip {clip_id} to {platform}...")
                
                success = False
                err_msg = ""
                
                if platform == "facebook":
                    success, err_msg = publish_to_facebook(
                        clip_filepath=clip_filepath,
                        title=item.get("title") or clip.get("title") or "ClipMood Highlight",
                        description=item.get("description") or "",
                        hashtags=item.get("hashtags") or []
                    )
                else:
                    # Mock/Simulate success for TikTok/Instagram/YouTube since their APIs 
                    # require complex business approvals or customized webhooks
                    time.sleep(2)
                    success = True
                    err_msg = ""
                    print(f"[MOCK] Successfully simulated mock post to {platform} for clip {clip_id}")
                
                if success:
                    db["publish_queue"].update_one(
                        {"queue_id": queue_id},
                        {"$set": {"status": "published", "published_at": datetime.utcnow().isoformat(), "updated_at": datetime.utcnow().isoformat()}}
                    )
                    print(f"[PUBLISHER] Successfully published item: {queue_id}")
                else:
                    db["publish_queue"].update_one(
                        {"queue_id": queue_id},
                        {"$set": {"status": "error", "error": err_msg, "updated_at": datetime.utcnow().isoformat()}}
                    )
                    print(f"[PUBLISHER] Failed publishing item {queue_id}: {err_msg}")
                    
        except Exception as loop_err:
            print(f"[PUBLISHER] Exception in background publishing loop: {loop_err}")
            
        # Poll database once every 30 seconds
        time.sleep(30)

def publish_to_facebook(clip_filepath: str, title: str, description: str, hashtags: list) -> tuple:
    """
    Submits a video clip to Facebook Page Videos API using Page Access Token.
    Falls back to mock simulation mode if API credentials are not provided.
    """
    page_id = os.getenv("FACEBOOK_PAGE_ID")
    access_token = os.getenv("FACEBOOK_ACCESS_TOKEN")
    
    # Support Mock/Sandbox fallback mode if credentials are placeholders or not set
    if not page_id or not access_token or "your_facebook" in page_id or "your_facebook" in access_token:
        print("[PUBLISHER] Facebook credentials not configured. Simulating Facebook Page Video upload...")
        time.sleep(3)
        return True, ""
        
    url = f"https://graph.facebook.com/v19.0/{page_id}/videos"
    caption = f"{title}\n\n{description}\n\n" + " ".join(hashtags)
    payload = {
        'description': caption.strip(),
        'access_token': access_token
    }
    
    try:
        with open(clip_filepath, 'rb') as f:
            files = {
                'source': f
            }
            # Set 3-minute timeout for uploading video file
            res = requests.post(url, data=payload, files=files, timeout=180)
            
        data = res.json()
        if res.status_code == 200 and "id" in data:
            print(f"[PUBLISHER] Facebook Video Upload Success! Post ID: {data['id']}")
            return True, ""
        else:
            err = data.get("error", {}).get("message") or res.text
            return False, f"Facebook API Error: {err}"
            
    except Exception as ex:
        return False, f"Network exception: {str(ex)}"

def start_publisher_worker():
    """
    Spawns the loop in a background daemon thread.
    """
    t = threading.Thread(target=run_publisher, daemon=True)
    t.start()
