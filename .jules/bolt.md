## 2025-02-18 - Fast Array Date Sorting
**Learning:** Parsing dates inside `sort()` or `filter()` calls (e.g., `new Date(a.created_at)`) creates significant overhead and garbage collection pressure, making it an O(N log N) or O(N) penalty that is highly sensitive to array size. The repository's memory instructs us to use native string inequality operators instead since dates here are ISO 8601 strings.
**Action:** Replace `new Date(x) - new Date(y)` with native `<` and `>` string operators for performance in `.filter()` and `.sort()` on ISO 8601 strings.
