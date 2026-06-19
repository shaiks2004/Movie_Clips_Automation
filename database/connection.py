import os
from dotenv import load_dotenv
from pymongo import MongoClient

# Load environment variables from .env
load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI")
if not MONGODB_URI:
    raise ValueError("Database Connection Error: MONGODB_URI not set in environment variables.")

# Create the global MongoDB Client
# Using a connection pool configured automatically by pymongo
client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=5000)

def get_db():
    """
    Returns the database instance for ClipMood.
    Extracts the database name from MONGODB_URI or defaults to 'clipmood'.
    """
    # Parse db name from Atlas URI connection string if specified, e.g. /clipmood?
    db_name = "clipmood"
    try:
        # Simple parser for database name in connection string
        path_part = MONGODB_URI.split("/")[-1]
        clean_name = path_part.split("?")[0]
        if clean_name:
            db_name = clean_name
    except Exception:
        pass
    
    return client[db_name]

def verify_connection():
    """
    Utility helper to check database availability.
    Runs a ping command against the cluster and returns True/False.
    """
    try:
        client.admin.command('ping')
        return True
    except Exception as e:
        print(f"MongoDB connection failed: {e}")
        return False
