import fs from "node:fs";

const catalogPath = "public/assets/games.json";
const adfreePath = ".strato-reports/repair/adfree-games.json";
const tkhoPath = ".strato-reports/repair/3kh0-games.json";

const games = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
const adfree = fs.existsSync(adfreePath)
  ? JSON.parse(fs.readFileSync(adfreePath, "utf8"))
  : [];
const tkho = fs.existsSync(tkhoPath)
  ? JSON.parse(fs.readFileSync(tkhoPath, "utf8"))
  : [];

// Map by common name patterns or IDs
const adfreeMap = new Map();
adfree.forEach((g) => {
  const name = g.name || g.title;
  if (!name) return;
  const slug = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  adfreeMap.set(slug, g.url);
});

const tkhoMap = new Map();
tkho.forEach((g) => {
  const name = g.name || g.title;
  if (!name) return;
  const slug = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  tkhoMap.set(slug, g.url);
});

let repairedCount = 0;
const updatedGames = games.map((game) => {
  if (game.reliability !== "red") return game;

  const slug = game.name.toLowerCase().replace(/[^a-z0-9]/g, "");

  // Try adfree first
  if (adfreeMap.has(slug)) {
    const rawUrl = adfreeMap.get(slug);
    let cleanUrl = rawUrl;

    if (!rawUrl.startsWith("http")) {
      cleanUrl = rawUrl.includes("game.html?game=")
        ? "https://adfree-sz-games.github.io" + rawUrl.split("game=")[1]
        : "https://adfree-sz-games.github.io" + rawUrl;
    }

    repairedCount++;
    return {
      ...game,
      url: cleanUrl,
      reliability: "yellow",
      source: "adfree-resurrection",
    };
  }

  // Try 3kh0
  if (tkhoMap.has(slug)) {
    const rawUrl = tkhoMap.get(slug);
    const cleanUrl = "https://3kh0.github.io/3kh0-lite/" + rawUrl;

    repairedCount++;
    return {
      ...game,
      url: cleanUrl,
      reliability: "yellow",
      source: "3kh0-resurrection",
    };
  }

  return game;
});

if (repairedCount > 0) {
  fs.writeFileSync(catalogPath, JSON.stringify(updatedGames, null, 2) + "\n");
  console.log(`\n🎉 Repaired ${repairedCount} games in Batch 2!`);
} else {
  console.log(`\n😔 No games repaired in this batch.`);
}
