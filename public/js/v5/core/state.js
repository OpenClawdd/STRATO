export const state = {
  games: [],
  normalized: [],
  activeMood: 'all',
  searchQuery: '',
  searchIndex: 0,
  launchBay: { status: 'empty', gameId: null, reason: '' },
};

export function setGames(games, normalizer = (game) => game) {
  state.games = Array.isArray(games) ? games : [];
  state.normalized = state.games.map(normalizer);
}

export function setLaunchBay(status, gameId = null, reason = '') {
  state.launchBay = { status, gameId, reason };
}
