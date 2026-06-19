## 2024-05-26 - Optimized Global Leaderboard Transformation
**Learning:** Found an N+1 object allocation bottleneck where `.map()` was called immediately on the entire `store.getAll("users")` array (creating thousands of unneeded objects) before `.sort()`ing and `.slice(0, 25)`ing.
**Action:** Always create a shallow copy (`[...allUsers]`), then `.sort()`, `.slice()`, and finally `.map()` the truncated list to minimize short-lived garbage object allocation when formatting large cached arrays.
