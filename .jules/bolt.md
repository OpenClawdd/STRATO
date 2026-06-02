## 2026-06-02 - Array map deferral and Cache mutations
**Learning:** Deferring .map() until after .filter(), .sort(), and .slice() significantly reduces O(N) memory allocations, and spreading an array before mutating it avoids bugs with in-memory db layers.
**Action:** Always verify array transforms that iterate over store.getAll() outputs to ensure they copy before mutating.
