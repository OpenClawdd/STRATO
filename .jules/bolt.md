## 2024-05-18 - Replacing O(N log N) sorts with O(N) bounded insertion sorts
**Learning:** Chaining full-array .sort() with .slice() to compute 'top N' analytical queries is inefficient, causing O(N log N) time complexity and redundant intermediate array allocations.
**Action:** Replaced these chains with an O(N) bounded insertion sort utility across multiple routes, mitigating CPU spikes during heavy leaderboard and analytics load.
