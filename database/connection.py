import os
from dotenv import load_dotenv

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI")

_db = None
_client = None
_using_memory = False


def _parse_db_name(uri: str) -> str:
    db_name = "clipmood"
    try:
        clean = uri.split("/")[-1].split("?")[0]
        if clean:
            db_name = clean
    except Exception:
        pass
    return db_name


def _init():
    global _db, _client, _using_memory
    if _db is not None:
        return
    if MONGODB_URI:
        try:
            from pymongo import MongoClient
            client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=3000)
            client.admin.command("ping")
            _client = client
            _db = client[_parse_db_name(MONGODB_URI)]
            print(f"[db] Connected to MongoDB database '{_parse_db_name(MONGODB_URI)}'.")
            return
        except Exception as e:
            print(f"[db] MongoDB unavailable ({e}).")
    else:
        print("[db] MONGODB_URI not set.")
    from database.memory_db import InMemoryDatabase
    _db = InMemoryDatabase()
    _using_memory = True
    print("[db] Using in-memory database (volatile). Data will NOT persist across "
          "restarts. Set MONGODB_URI to a real MongoDB/Atlas cluster for persistence.")


def get_db():
    _init()
    return _db


def is_using_memory() -> bool:
    _init()
    return _using_memory


def verify_connection() -> bool:
    _init()
    if _using_memory:
        return True
    try:
        _client.admin.command("ping")
        return True
    except Exception as e:
        print(f"MongoDB connection failed: {e}")
        return False
