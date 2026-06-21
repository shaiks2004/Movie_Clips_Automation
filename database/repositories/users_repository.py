from datetime import datetime
from database.connection import get_db

class UsersRepository:
    def __init__(self):
        self.db = get_db()
        self.collection = self.db["users"]

    def get_user(self, email: str) -> dict:
        """
        Retrieves a user profile by normalized email.
        """
        if not email:
            return None
        return self.collection.find_one({"email": email.strip().lower()})

    def is_premium(self, email: str) -> bool:
        """
        Checks if a user is registered and holds active premium subscription status.
        """
        user = self.get_user(email)
        if not user:
            return False
        return bool(user.get("is_premium", False))

    def activate_premium(self, email: str):
        """
        Upserts a user record and flags them as premium with activation details.
        """
        normalized_email = email.strip().lower()
        self.collection.update_one(
            {"email": normalized_email},
            {
                "$set": {
                    "is_premium": True,
                    "activated_at": datetime.utcnow().isoformat()
                }
            },
            upsert=True
        )

    def register_user(self, email: str) -> dict:
        """
        Registers a user under the free tier if not already present.
        """
        normalized_email = email.strip().lower()
        existing = self.get_user(normalized_email)
        if existing:
            return existing

        user_doc = {
            "email": normalized_email,
            "is_premium": False,
            "role": "free",
            "is_suspended": False,
            "created_at": datetime.utcnow().isoformat()
        }
        self.collection.insert_one(user_doc)
        return user_doc

    def get_all_users(self, search_query: str = None, filter_tier: str = None) -> list:
        """
        Fetches all users with optional email search and tier/role filtering.
        """
        query = {}
        if search_query:
            query["email"] = {"$regex": search_query.strip().lower(), "$options": "i"}
        
        if filter_tier:
            if filter_tier == "premium":
                query["is_premium"] = True
            elif filter_tier == "free":
                query["is_premium"] = False
                query["role"] = {"$ne": "super_admin"}
            elif filter_tier in ["admin", "super_admin"]:
                query["role"] = filter_tier
                
        return list(self.collection.find(query).sort("created_at", -1))

    def update_role(self, email: str, role: str) -> bool:
        """
        Updates the user's role explicitly.
        """
        res = self.collection.update_one(
            {"email": email.strip().lower()},
            {"$set": {"role": role, "updated_at": datetime.utcnow().isoformat()}}
        )
        return res.modified_count > 0

    def suspend_user(self, email: str, is_suspended: bool) -> bool:
        """
        Toggles the user's suspension flag.
        """
        res = self.collection.update_one(
            {"email": email.strip().lower()},
            {"$set": {"is_suspended": is_suspended, "updated_at": datetime.utcnow().isoformat()}}
        )
        return res.modified_count > 0

    def delete_user(self, email: str) -> bool:
        """
        Removes a user record.
        """
        res = self.collection.delete_one({"email": email.strip().lower()})
        return res.deleted_count > 0

    def deactivate_premium(self, email: str) -> bool:
        """
        Downgrades a user from premium to free.
        """
        res = self.collection.update_one(
            {"email": email.strip().lower()},
            {
                "$set": {
                    "is_premium": False,
                    "role": "free",
                    "deactivated_at": datetime.utcnow().isoformat()
                }
            }
        )
        return res.modified_count > 0
