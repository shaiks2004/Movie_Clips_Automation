import uuid
from datetime import datetime
from database.connection import get_db

class PublishRepository:
    def __init__(self):
        self.db = get_db()
        self.collection = self.db["publish_queue"]

    def add_to_queue(self, clip_id: str, title: str, description: str,
                     hashtags: list, platform: str, schedule_time: str) -> dict:
        """
        Adds a clip draft into the social media publishing queue.
        """
        # Parse ISO string to a UTC datetime object
        try:
            clean_time = schedule_time.replace("Z", "+00:00")
            dt_obj = datetime.fromisoformat(clean_time)
            # Normalize to timezone-naive UTC
            if dt_obj.tzinfo is not None:
                from datetime import timezone
                dt_obj = dt_obj.astimezone(timezone.utc).replace(tzinfo=None)
        except Exception:
            dt_obj = datetime.utcnow()

        doc = {
            "queue_id": str(uuid.uuid4())[:8],
            "clip_id": clip_id,
            "title": title,
            "description": description,
            "hashtags": hashtags or [],
            "platform": platform.strip().lower(), # e.g. tiktok, reels, youtube
            "schedule_time": dt_obj, # Store as real datetime object
            "status": "queued", # queued, scheduled, error
            "created_at": datetime.utcnow()
        }
        self.collection.insert_one(doc)
        return doc

    def get_queue(self, email: str):
        """
        Fetches the complete schedule queue list for a user.
        """
        pipeline = [
            # 1. Join with clips
            {
                "$lookup": {
                    "from": "clips",
                    "localField": "clip_id",
                    "foreignField": "clip_id",
                    "as": "clip_info"
                }
            },
            {"$unwind": "$clip_info"},
            # 2. Join with videos to authenticate owner
            {
                "$lookup": {
                    "from": "videos",
                    "localField": "clip_info.video_id",
                    "foreignField": "video_id",
                    "as": "video_info"
                }
            },
            {"$unwind": "$video_info"},
            # 3. Filter by owner email
            {"$match": {"video_info.uploaded_by": email.strip().lower()}},
            # 4. Sort by schedule time
            {"$sort": {"schedule_time": 1}}
        ]
        return list(self.collection.aggregate(pipeline))

    def update_status(self, queue_id: str, status: str) -> bool:
        """
        Updates the schedule item status (e.g. published, failed).
        """
        result = self.collection.update_one(
            {"queue_id": queue_id},
            {"$set": {"status": status, "updated_at": datetime.utcnow().isoformat()}}
        )
        return result.modified_count > 0

    def delete_from_queue(self, queue_id: str) -> bool:
        """
        Removes an item from the schedule list.
        """
        result = self.collection.delete_one({"queue_id": queue_id})
        return result.deleted_count > 0
