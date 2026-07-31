import { dailyPicks } from "./public/js/v5/core/picks.js";
import { state } from "./public/js/v5/core/state.js";

// Mock games
state.games = Array.from({ length: 10000 }, (_, i) => ({
  id: `game-${i}`,
  name: `Game ${i}`,
  category: i % 2 === 0 ? "Arcade" : "Action",
  tags: [],
}));

state.catalogMemo = {
  playable: null,
  promotable: null,
  moods: null,
  gameById: null,
};

// Mock health
import * as health from "./public/js/v5/core/health.js";
health.healthCache.get = () => ({ playable: true });
health.health = () => ({ status: "ok" });
health.launchability = () => ({ kind: "ok", status: "ok", launchable: true });

// Warmup
dailyPicks();

const start = performance.now();
for (let i = 0; i < 50; i++) {
  state.catalogMemo.promotable = null;
  dailyPicks(new Date(2024, 1, i)); // change date to avoid caching if any
}
const end = performance.now();

console.log(`Time: ${(end - start).toFixed(2)}ms`);
