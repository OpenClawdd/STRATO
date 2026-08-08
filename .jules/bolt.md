## 2025-08-08 - String vs Date comparisons
**Learning:** Parsing dates via `new Date()` inside loops (like `.filter` or `.sort`) creates massive O(N) overhead and GC pressure. ISO 8601 strings can be safely compared lexicographically.
**Action:** Pre-compute the ISO string threshold outside the loop and use native string inequalities (`> / <`) to filter items without parsing each one.
