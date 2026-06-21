from datetime import datetime
from database.connection import get_db

class PerformanceRepository:
    def __init__(self):
        self.db = get_db()
        self.collection = self.db["clip_performance"]

    def track_performance(self, clip_id: str, platform: str, views: int = 0,
                          likes: int = 0, shares: int = 0, comments: int = 0,
                          retention_rate: float = 0.0) -> dict:
        """
        Upserts a performance tracking entry for a given clip on a specific platform.
        """
        query = {"clip_id": clip_id, "platform": platform.strip().lower()}
        doc = {
            "clip_id": clip_id,
            "platform": platform.strip().lower(),
            "views": int(views),
            "likes": int(likes),
            "shares": int(shares),
            "comments": int(comments),
            "retention_rate": float(retention_rate),
            "updated_at": datetime.utcnow()
        }
        
        self.collection.update_one(query, {"$set": doc}, upsert=True)
        return doc

    def get_clip_performance(self, clip_id: str) -> list:
        """
        Retrieves performance metrics across all platforms for a single clip.
        """
        return list(self.collection.find({"clip_id": clip_id}))

    def get_all_performance(self, limit: int = 100) -> list:
        """
        Retrieves all clip performance logs.
        """
        return list(self.collection.find().sort("updated_at", -1).limit(limit))

    def get_aggregated_metrics(self) -> dict:
        """
        Pulls system-wide totals for performance metrics.
        """
        pipeline = [
            {
                "$group": {
                    "_id": None,
                    "total_views": {"$sum": "$views"},
                    "total_likes": {"$sum": "$likes"},
                    "total_shares": {"$sum": "$shares"},
                    "total_comments": {"$sum": "$comments"},
                    "avg_retention": {"$avg": "$retention_rate"}
                }
            }
        ]
        res = list(self.collection.aggregate(pipeline))
        if res:
            return {
                "total_views": res[0].get("total_views", 0),
                "total_likes": res[0].get("total_likes", 0),
                "total_shares": res[0].get("total_shares", 0),
                "total_comments": res[0].get("total_comments", 0),
                "avg_retention": round(res[0].get("avg_retention", 0.0), 2)
            }
        return {
            "total_views": 0,
            "total_likes": 0,
            "total_shares": 0,
            "total_comments": 0,
            "avg_retention": 0.0
        }
