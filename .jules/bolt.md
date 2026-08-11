## 2024-08-11 - [Optimize leaderboard generation memory overhead]
**Learning:** Mapping over an entire database of items (creating new objects) just to sort them is extremely slow compared to native Array.prototype.sort(). By doing mapping *after* sort and slice, memory overhead is greatly reduced.
**Action:** When sorting databases of items, always apply transformations (map) after reducing the set to only the top N results needed using `.slice(0, N)`.
