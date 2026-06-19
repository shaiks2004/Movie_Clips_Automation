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
            "created_at": datetime.utcnow().isoformat()
        }
        self.collection.insert_one(user_doc)
        return user_doc
