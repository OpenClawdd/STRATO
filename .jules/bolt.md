## 2024-08-10 - [Avoid new Date() in array loops]
**Learning:** Parsing dates inside array `.filter()` or `.sort()` loops (e.g., `new Date(a.created_at)`) creates significant O(N log N) or O(N) execution overhead and garbage collection pressure in Node.js.
**Action:** When dealing with ISO 8601 formatted date strings, compare them lexicographically as native strings instead of instantiating new Date objects inside the loop.
