export const state = {
  games: [],
  activeMood: "all",
  searchQuery: "",
  searchIndex: 0,
  lastLaunchId: null,
};

export function setGames(games) {
  state.games = Array.isArray(games) ? games : [];
}
