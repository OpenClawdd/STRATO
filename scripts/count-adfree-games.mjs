import fs from 'fs';
const data = fs.readFileSync('/Users/noahmendieta/.gemini/antigravity-cli/brain/4b2ecb56-566e-4a3c-b919-f74eacec3cac/scratch/adfree-games.json', 'utf8');
const games = JSON.parse(data);
console.log(`Total games in adfree-sz-games: ${games.length}`);
console.log(JSON.stringify(games.slice(0, 5), null, 2));
