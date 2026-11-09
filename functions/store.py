"""Firestore helpers: caching, per-user quotas, and profile reads."""

from __future__ import annotations

import datetime as dt
from typing import Any, Callable

from google.cloud import firestore as gcFirestore

foodCacheDays = 7
analysisCacheDays = 30


def _now() -> dt.datetime:
    return dt.datetime.now(dt.timezone.utc)


def _isFresh(document: dict[str, Any] | None, maxAgeDays: int) -> bool:
    if not document:
        return False
    createdAt = document.get("createdAt")
    if not isinstance(createdAt, dt.datetime):
        return False
    if createdAt.tzinfo is None:
        createdAt = createdAt.replace(tzinfo=dt.timezone.utc)
    return _now() - createdAt < dt.timedelta(days=maxAgeDays)


class Store:
    def __init__(self, database: gcFirestore.Client):
        self.database = database

    # ----- Profiles -----

    def readProfile(self, uid: str) -> dict[str, Any]:
        snapshot = self.database.collection("users").document(uid).get()
        data = snapshot.to_dict() if snapshot.exists else None
        return (data or {}).get("profile") or {}

    # ----- Caches -----

    def cached(self, collection: str, key: str, maxAgeDays: int, produce: Callable[[], Any]) -> Any:
        """Return a fresh cached value, or produce, store, and return a new one.

        A None result is not cached, so a temporary miss can be retried.
        """
        reference = self.database.collection(collection).document(key)
        snapshot = reference.get()
        if snapshot.exists:
            document = snapshot.to_dict()
            if _isFresh(document, maxAgeDays):
                return document.get("value")
        value = produce()
        if value is not None:
            reference.set({"value": value, "createdAt": _now()})
        return value

    def cachedFood(self, fdcId: int, produce: Callable[[], Any]) -> Any:
        return self.cached("foodCache", str(fdcId), foodCacheDays, produce)

    def cachedAnalysis(self, key: str, produce: Callable[[], Any], refresh: bool = False) -> Any:
        if refresh:
            self.database.collection("analysisCache").document(key).delete()
        return self.cached("analysisCache", key, analysisCacheDays, produce)

    # ----- Quotas -----

    def consumeQuota(self, uid: str, bucket: str, dailyLimit: int) -> bool:
        """Atomically count one use for today. Returns False when the limit is reached."""
        today = _now().strftime("%Y%m%d")
        reference = self.database.collection("usage").document(f"{uid}_{bucket}_{today}")
        transaction = self.database.transaction()

        @gcFirestore.transactional
        def increment(activeTransaction: gcFirestore.Transaction) -> bool:
            snapshot = reference.get(transaction=activeTransaction)
            count = (snapshot.to_dict() or {}).get("count", 0) if snapshot.exists else 0
            if count >= dailyLimit:
                return False
            activeTransaction.set(
                reference,
                {"uid": uid, "bucket": bucket, "day": today, "count": count + 1, "updatedAt": _now()},
            )
            return True

        return increment(transaction)
