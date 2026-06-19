from datetime import datetime
from database.connection import get_db

class VideoRepository:
    def __init__(self):
        self.db = get_db()
        self.collection = self.db["videos"]

    def create_video(self, video_id: str, filename: str, filepath: str, email: str) -> dict:
        """
        Creates a new tracking log document for a video upload.
        """
        doc = {
            "video_id": video_id,
            "filename": filename,
            "filepath": filepath,
            "uploaded_by": email.strip().lower(),
            "status": "queued",
            "progress": 0,
            "total_duration": 0.0,
            "transcript_path": None,
            "scenes_path": None,
            "error": None,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        self.collection.insert_one(doc)
        return doc

    def get_video(self, video_id: str) -> dict:
        """
        Retrieves video state by ID.
        """
        return self.collection.find_one({"video_id": video_id})

    def get_user_videos(self, email: str):
        """
        Retrieves all videos uploaded by a specific user email.
        """
        return list(self.collection.find({"uploaded_by": email.strip().lower()}).sort("created_at", -1))

    def update_status(self, video_id: str, status: str, progress: int = None, error: str = None, total_duration: float = None) -> bool:
        """
        Updates the execution status and progress tracking parameters.
        """
        update_doc = {
            "status": status,
            "updated_at": datetime.utcnow().isoformat()
        }
        if progress is not None:
            update_doc["progress"] = progress
        if error is not None:
            update_doc["error"] = error
        if total_duration is not None:
            update_doc["total_duration"] = total_duration

        result = self.collection.update_one(
            {"video_id": video_id},
            {"$set": update_doc}
        )
        return result.modified_count > 0

    def link_metadata(self, video_id: str, transcript_path: str = None, scenes_path: str = None) -> bool:
        """
        Links processing artifacts paths.
        """
        update_doc = {"updated_at": datetime.utcnow().isoformat()}
        if transcript_path:
            update_doc["transcript_path"] = transcript_path
        if scenes_path:
            update_doc["scenes_path"] = scenes_path

        result = self.collection.update_one(
            {"video_id": video_id},
            {"$set": update_doc}
        )
        return result.modified_count > 0
