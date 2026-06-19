from pymongo import ASCENDING, DESCENDING
from database.connection import get_db

def setup_indexes():
    """
    Initializes indexes on MongoDB collections to optimize search,
    sorting, and unique identifier validation.
    """
    db = get_db()
    
    print("Setting up MongoDB database indexes...")
    
    # 1. users collection indexes
    users = db["users"]
    users.create_index([("email", ASCENDING)], unique=True)
    print("[OK] Created index 'email' on collection 'users'")
    
    # 2. videos collection indexes
    videos = db["videos"]
    videos.create_index([("video_id", ASCENDING)], unique=True)
    videos.create_index([("uploaded_by", ASCENDING)])
    videos.create_index([("status", ASCENDING)])
    videos.create_index([("created_at", DESCENDING)])
    print("[OK] Created indexes on collection 'videos'")
    
    # 3. clips collection indexes
    clips = db["clips"]
    clips.create_index([("clip_id", ASCENDING)], unique=True)
    clips.create_index([("video_id", ASCENDING)])
    clips.create_index([("mood", ASCENDING)])
    clips.create_index([("created_at", DESCENDING)])
    print("[OK] Created indexes on collection 'clips'")
    
    # 4. publish_queue collection indexes
    publish_queue = db["publish_queue"]
    publish_queue.create_index([("queue_id", ASCENDING)], unique=True)
    publish_queue.create_index([("clip_id", ASCENDING)])
    publish_queue.create_index([("schedule_time", ASCENDING)])
    publish_queue.create_index([("status", ASCENDING)])
    print("[OK] Created indexes on collection 'publish_queue'")
    
    print("MongoDB indexes configuration complete.")

if __name__ == "__main__":
    setup_indexes()
