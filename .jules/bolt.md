## 2025-02-18 - Optimize Top N Leaderboard Calculations
**Learning:** Full array maps followed by full array sorts to calculate global leaderboards or top 10 game leaderboards cause heavy memory allocations and spikes in CPU, running in O(N log N) with a large constant factor.
**Action:** Implement bounded insertion sorts to calculate Top N lists. This reduces the time complexity to O(N) and drastically reduces the number of short-lived objects allocated.
