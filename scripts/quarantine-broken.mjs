import fs from "node:fs";
import path from "node:path";

const catalogPath = "public/assets/games.json";
const healthPath = ".strato-reports/catalog-source-health.json";

if (!fs.existsSync(healthPath)) {
  console.error("❌ No health report found. Run source-doctor first.");
  process.exit(1);
}

const games = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
const health = JSON.parse(fs.readFileSync(healthPath, "utf8"));

const healthMap = new Map(health.map(item => [item.id, item.status]));

let marked = 0;
const updatedGames = games.map(game => {
  const status = healthMap.get(game.id);
  if (status && status !== "ok") {
    marked++;
    return { ...game, reliability: "red", needsReview: true };
  }
  return game;
});

fs.writeFileSync(catalogPath, JSON.stringify(updatedGames, null, 2) + "\n");
console.log(`✅ Marked ${marked} broken games as 'red' (quarantined).`);
