"""In-memory MongoDB-compatible shim for ClipMood.

Implements the subset of the pymongo API used by the repositories so the
application can run with ZERO external dependencies when a real MongoDB/Atlas
cluster is not configured. NOTE: data is volatile and lost on restart — set
MONGODB_URI to a real cluster for persistence.
"""
import copy
import uuid


def _get_nested(doc, dotted):
    cur = doc
    for part in dotted.split("."):
        if isinstance(cur, dict) and part in cur:
            cur = cur[part]
        else:
            return None
    return cur


def _matches(doc, query):
    for key, cond in (query or {}).items():
        if _get_nested(doc, key) != cond:
            return False
    return True


def _sort_key(field):
    def key(d):
        v = _get_nested(d, field)
        return (v is None, v)
    return key


class _InsertResult:
    def __init__(self, inserted_id): self.inserted_id = inserted_id


class _UpdateResult:
    def __init__(self, matched, modified, upserted_id=None):
        self.matched_count = matched
        self.modified_count = modified
        self.upserted_id = upserted_id


class _DeleteResult:
    def __init__(self, deleted): self.deleted_count = deleted


class _Cursor:
    def __init__(self, docs): self._docs = docs
    def sort(self, field, direction=1):
        self._docs.sort(key=_sort_key(field), reverse=(direction == -1)); return self
    def __iter__(self): return iter(self._docs)
    def __len__(self): return len(self._docs)


class InMemoryCollection:
    def __init__(self, name, db):
        self.name = name; self.db = db; self.docs = []

    def create_index(self, *a, **k): return f"{self.name}_idx"

    def find_one(self, query=None):
        for d in self.docs:
            if _matches(d, query): return copy.deepcopy(d)
        return None

    def find(self, query=None):
        return _Cursor([copy.deepcopy(d) for d in self.docs if _matches(d, query)])

    def insert_one(self, doc):
        stored = copy.deepcopy(doc)
        if "_id" not in stored: stored["_id"] = str(uuid.uuid4())
        self.docs.append(stored)
        if "_id" not in doc: doc["_id"] = stored["_id"]
        return _InsertResult(stored["_id"])

    def update_one(self, query, update, upsert=False):
        set_fields = (update or {}).get("$set", {})
        for d in self.docs:
            if _matches(d, query):
                modified = False
                for k, v in set_fields.items():
                    if d.get(k) != v: modified = True
                    d[k] = v
                return _UpdateResult(1, 1 if modified else 0)
        if upsert:
            new = {k: v for k, v in (query or {}).items() if "." not in k}
            new.update(set_fields); new["_id"] = str(uuid.uuid4())
            self.docs.append(new)
            return _UpdateResult(0, 0, new["_id"])
        return _UpdateResult(0, 0)

    def delete_one(self, query):
        for i, d in enumerate(self.docs):
            if _matches(d, query):
                del self.docs[i]; return _DeleteResult(1)
        return _DeleteResult(0)

    def aggregate(self, pipeline):
        docs = [copy.deepcopy(d) for d in self.docs]
        for stage in pipeline or []:
            if "$lookup" in stage:
                s = stage["$lookup"]; foreign = self.db[s["from"]]
                lf, ff, asn = s["localField"], s["foreignField"], s["as"]
                for d in docs:
                    lv = _get_nested(d, lf)
                    d[asn] = [copy.deepcopy(fd) for fd in foreign.docs if _get_nested(fd, ff) == lv]
            elif "$unwind" in stage:
                field = stage["$unwind"]
                if isinstance(field, dict): field = field.get("path", "")
                field = str(field).lstrip("$")
                out = []
                for d in docs:
                    arr = d.get(field)
                    if isinstance(arr, list):
                        for it in arr:
                            nd = copy.deepcopy(d); nd[field] = it; out.append(nd)
                    elif arr is not None: out.append(d)
                docs = out
            elif "$match" in stage:
                docs = [d for d in docs if _matches(d, stage["$match"])]
            elif "$sort" in stage:
                for field, direction in reversed(list(stage["$sort"].items())):
                    docs.sort(key=_sort_key(field), reverse=(direction == -1))
        return docs


class InMemoryDatabase:
    def __init__(self): self._collections = {}
    def __getitem__(self, name):
        if name not in self._collections:
            self._collections[name] = InMemoryCollection(name, self)
        return self._collections[name]
    def get_collection(self, name): return self[name]
