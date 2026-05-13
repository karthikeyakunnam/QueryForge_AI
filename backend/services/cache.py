import hashlib
import time
from collections import OrderedDict
from typing import Any, Optional


class TTLCache:
    def __init__(self, max_size: int = 512, ttl_seconds: int = 900):
        self.max_size = max_size
        self.ttl_seconds = ttl_seconds
        self._items: OrderedDict[str, tuple[float, Any]] = OrderedDict()

    def get(self, key: str) -> Optional[Any]:
        now = time.time()
        item = self._items.get(key)
        if not item:
            return None
        expires_at, value = item
        if expires_at < now:
            self._items.pop(key, None)
            return None
        self._items.move_to_end(key)
        return value

    def set(self, key: str, value: Any) -> None:
        self._items[key] = (time.time() + self.ttl_seconds, value)
        self._items.move_to_end(key)
        while len(self._items) > self.max_size:
            self._items.popitem(last=False)


def stable_cache_key(*parts: object) -> str:
    raw = "|".join(str(part) for part in parts)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


retrieval_cache = TTLCache(max_size=256, ttl_seconds=600)
