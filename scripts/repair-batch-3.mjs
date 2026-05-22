import fs from 'fs';
import path from 'path';

const GAMES_PATH = 'public/assets/games.json';
const games = JSON.parse(fs.readFileSync(GAMES_PATH, 'utf8'));

const repairs = [
  { id: 'bitlife', url: 'https://adfree-sz-games.github.io/Games9/bitlife', reliability: 'green' },
  { id: 'moto-x3m', url: 'https://tbg95.github.io/moto-x3m/game', reliability: 'green' },
  { id: 'drift-hunters', url: 'https://webglmath.github.io/drift-hunters/', reliability: 'green' },
  { id: 'tunnel-rush', url: 'https://adfree-sz-games.github.io/Games9/tunnel-rush/', reliability: 'green' },
  { id: 'paper-io-2', url: 'https://3kh0.github.io/3kh0-assets/paper-io-2/', reliability: 'green' },
  { id: 'smash-karts', url: 'https://3kh0.github.io/3kh0-assets/smash-karts/', reliability: 'green' },
  { id: 'fnf', url: 'https://3kh0.github.io/3kh0-assets/friday-night-funkin/', reliability: 'green' },
  { id: 'crossy-road', url: 'https://3kh0.github.io/3kh0-assets/crossy-road/', reliability: 'green' }
];

let updatedCount = 0;

repairs.forEach(repair => {
  const game = games.find(g => g.id === repair.id);
  if (game) {
    console.log(`[REPAIR] ${game.title}: ${game.url} -> ${repair.url}`);
    game.url = repair.url;
    game.reliability = repair.reliability;
    updatedCount++;
  } else {
    console.warn(`[WARN] Game not found: ${repair.id}`);
  }
});

fs.writeFileSync(GAMES_PATH, JSON.stringify(games, null, 2));
console.log(`\n✅ Finished. Repaired ${updatedCount} high-value entries.`);
