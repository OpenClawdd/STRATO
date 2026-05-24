import fs from 'node:fs/promises';
import path from 'node:path';

const GAMES_PATH = path.resolve(process.cwd(), 'public/assets/games.json');
const csvPath = process.argv[2];
if (!csvPath) {
  console.error('Usage: node scripts/import-games.mjs new-games.csv');
  process.exit(1);
}

const games = JSON.parse(await fs.readFile(GAMES_PATH, 'utf8'));
const existing = new Set(games.map((g) => g.id));

const csv = await fs.readFile(csvPath, 'utf8');
const rows = csv.replace(/^\uFEFF/, '').trim().split('\n').slice(1);

let added = 0;
for (const line of rows) {
  if (!line.trim() || line.startsWith('#')) continue;
  const [titleRaw, url, category, sourceFamilyRaw] = line
    .split(',')
    .map((s) => s.replace(/^"|"$/g, '').trim());
  const title = titleRaw;
  let id = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  if (existing.has(id)) continue;
  const sourceFamily =
    sourceFamilyRaw || new URL(url).hostname.replace(/^www\./, '');
  games.push({
    id,
    title,
    url,
    sourceFamily,
    category: category || 'arcade',
    thumbnail: '',
    reliability: 'green',
    urlKind: 'game',
    blockedCategories: [],
  });
  existing.add(id);
  added++;
}

await fs.writeFile(GAMES_PATH, JSON.stringify(games, null, 2) + '\n');
console.log(`Added ${added} games. Total: ${games.length}`);
