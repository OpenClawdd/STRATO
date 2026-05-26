## 2024-05-26 - In-Memory Cache Array Mutation
**Learning:** `store.getAll()` returns a direct reference to the in-memory cache data array to save time and memory. Mutating this array directly, especially by chaining `.sort()`, breaks the cache state across the entire application and can lead to unexpected behavior and subtle bugs.
**Action:** When performing destructive or mutating operations such as `.sort()` on dataset arrays retrieved from the file store cache, always explicitly create a shallow copy of the array first using the spread operator (e.g. `[...data]`) before performing the operation.

## 2024-05-26 - Map vs. Slice Order of Operations for Memory Savings
**Learning:** Mapping over huge arrays (`N = 10,000+`) allocates a tremendous amount of short-lived objects leading to increased memory pressure and GC pauses, especially when only a tiny fraction of those entries is needed (e.g. a top 25 slice).
**Action:** Always filter, sort, and slice large dataset arrays to the desired subset before applying a final `.map()` to create objects. This reduces short-lived object allocations from `O(N)` to `O(K)`.
