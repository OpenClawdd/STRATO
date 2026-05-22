import fs from "fs";
const data = fs.readFileSync(
  ".strato-reports/repair/adfree-games.json",
  "utf8",
);
const games = JSON.parse(data);
console.log(`Total games in adfree-sz-games: ${games.length}`);
console.log(JSON.stringify(games.slice(0, 5), null, 2));
