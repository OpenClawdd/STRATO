## 2024-08-04 - Lexicographical Date String Sorting
**Learning:** Parsing dates inside array `.sort()` loops (e.g., `new Date(a.created_at)`) creates significant O(N log N) execution overhead and garbage collection pressure in Node.js when sorting large arrays. ISO 8601 date strings can be safely and much faster compared lexicographically.
**Action:** Use native string inequality operators (`<` and `>`) with fallback values instead of `new Date()` or `localeCompare()` for sorting timestamp strings.
