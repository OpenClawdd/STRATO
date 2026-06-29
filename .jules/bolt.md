## 2025-02-28 - Bounded Insertion Sort for Leaderboards
**Learning:** Found O(N log N) sorts paired with full-array `.map()` and chained `.filter()` calls on large user/score datasets in `src/routes/leaderboard.js`. This creates short-lived objects and causes CPU spikes when computing top N leaderboards.
**Action:** Extract a `getTopN` bounded insertion sort utility to process large datasets in a single pass (O(N) time, O(1) space), handling `undefined` properties with `|| 0` to prevent JS regressions. Use this for global and game leaderboards instead of `.filter().sort().slice()`.
