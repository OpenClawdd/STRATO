export const state = {
  games: [],
  normalized: [],
  activeMood: "all",
  searchQuery: "",
  searchIndex: 0,
  launchBay: { status: "empty", gameId: null, reason: "" },
  proxyLaunchTelemetry: { stage: "idle", gameId: null, reason: "", at: 0 },
};

export function setGames(games, normalizer = (game) => game) {
  state.games = Array.isArray(games) ? games : [];
  state.normalized = state.games.map(normalizer);
}

export function setLaunchBay(status, gameId = null, reason = "") {
  state.launchBay = { status, gameId, reason };
}

export function setProxyLaunchTelemetry(stage, gameId = null, reason = "") {
  state.proxyLaunchTelemetry = { stage, gameId, reason, at: Date.now() };
}
