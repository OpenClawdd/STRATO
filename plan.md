1. Add a bounded insertion sort utility `topN` in `src/utils/sort.js`. This will allow computing "top N" subsets in $O(N)$ time instead of $O(N \log N)$ and prevents large array allocations and sorts when returning small limits like leaderboards.
2. Refactor `src/routes/leaderboard.js` to use `topN` instead of `map().sort().slice()` when computing the global leaderboard.
3. Refactor `src/routes/admin.js` to use a single pass for aggregate stats (e.g. `totalGamesPlayed`, `totalXp`, `avgLevel`, `recentSignups`, `activeUsers`) and `topN` for `topUsers` and `gamesLeaderboard`, eliminating multiple full array passes and sorts.
4. Refactor `src/routes/notifications.js` to use `topN` instead of `sort().slice()` when computing global analytics for `topByXp`.
5. Write an optimization journal entry describing the performance fix.
6. Verify changes run successfully with tests and pre-commit checks.
7. Submit PR with performance impact context.
