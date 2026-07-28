## 2023-10-27 - Precomputed sort keys for dailyPicks
**Learning:** The previous implementation computed `hash(date:id)` multiple times per item during the `O(N log N)` sort comparisons, leading to redundant heavy string manipulation and mathematical operations on large catalogs.
**Action:** Always precompute expensive key evaluations (like string hashes or deep object lookups) by mapping items to `{ item, key }` before performing array sorts on large collections.
