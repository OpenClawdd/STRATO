import fs from "node:fs";

const catalogPath = "public/assets/games.json";
const workingGamesPath = ".strato-reports/working-games.json";

if (!fs.existsSync(workingGamesPath)) {
  console.error("❌ No working-games.json found. Run source doctor first.");
  process.exit(1);
}

const games = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
const workingGames = JSON.parse(fs.readFileSync(workingGamesPath, "utf8"));
const workingIds = new Set(workingGames.map(g => g.id));

console.log(`🚀 Promoting ${workingIds.size} verified games to GREEN...`);

let promotedCount = 0;
const updatedGames = games.map(game => {
  if (workingIds.has(game.id)) {
    if (game.reliability !== "green") {
      promotedCount++;
      return { ...game, reliability: "green" };
    }
  }
  return game;
});

if (promotedCount > 0) {
  fs.writeFileSync(catalogPath, JSON.stringify(updatedGames, null, 2) + "\n");
  console.log(`\n🎉 Success! Promoted ${promotedCount} games to GREEN.`);
} else {
  console.log(`\n✅ All verified games are already GREEN.`);
}
