## 2024-07-16 - [Bounded Sort]
**Learning:** O(n log n) sorting on a large dataset before slicing can be expensive. Replacing it with an O(n * N) algorithm to just find top N elements reduces time complexity to linear time when N is small, which is useful when dealing with big arrays like store.getAll().
**Action:** Use getTopN rather than sort().slice(). Apply map after getTopN.
