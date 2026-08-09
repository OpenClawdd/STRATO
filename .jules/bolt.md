## 2023-10-24 - Optimize Date sorting and filtering
**Learning:** Repeatedly instantiating `new Date(string)` inside `.sort()` or `.filter()` loops creates major O(N) or O(N log N) overhead and garbage collection pressure, leading to slow API responses on large datasets like chat messages, scores, or notifications.
**Action:** When working with ISO 8601 date strings, use native string inequalities and string comparisons (`<`, `>`, and ternary operators) rather than parsing them into Date objects. Lexicographical string comparison is accurate for ISO 8601 and significantly faster.
