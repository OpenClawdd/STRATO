import fs from 'fs';
import path from 'path';

const CATALOG_PATH = 'public/assets/games.json';
const SOURCES = [
  {
    path: '/Users/noahmendieta/.gemini/antigravity-cli/brain/4b2ecb56-566e-4a3c-b919-f74eacec3cac/scratch/adfree-games.json',
    baseUrl: 'https://adfree-sz-games.github.io'
  },
  {
    path: '/Users/noahmendieta/.gemini/antigravity-cli/brain/4b2ecb56-566e-4a3c-b919-f74eacec3cac/scratch/3kh0-games.json',
    baseUrl: 'https://3kh0.github.io'
  }
];

const rawCatalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
const games = rawCatalog;
const nameMap = new Map();
games.forEach(g => {
  nameMap.set(g.name.toLowerCase().trim(), g);
});

let totalUpdated = 0;

SOURCES.forEach(source => {
  if (!fs.existsSync(source.path)) return;
  
  const sourceData = JSON.parse(fs.readFileSync(source.path, 'utf8'));
  console.log(`Processing source: ${path.basename(source.path)} (${sourceData.length} games)`);
  
  let sourceUpdated = 0;
  
  sourceData.forEach(item => {
    const name = (item.name || item.title || '').toLowerCase().trim();
    if (!name) return;
    
    const existing = nameMap.get(name);
    
    if (existing) {
      if (existing.reliability === 'red' || existing.needsCheck || !existing.reliability) {
        let newUrl = item.url || item.link;
        
        if (source.baseUrl.includes('3kh0')) {
          // 3kh0-lite structure: "link": "projects/1/index.html"
          if (newUrl.startsWith('projects/')) {
            newUrl = `${source.baseUrl}/${newUrl}`;
          }
        } else {
          // adfree-sz-games logic
          if (newUrl.startsWith('/')) {
            newUrl = `${source.baseUrl}${newUrl}`;
          }
          if (newUrl.includes('game.html?game=')) {
            newUrl = newUrl.split('game.html?game=')[1];
          }
          if (newUrl.includes('unity.html?game=')) {
            newUrl = newUrl.split('unity.html?game=')[1];
          }
          if (newUrl.startsWith('/')) {
            newUrl = `${source.baseUrl}${newUrl}`;
          }
        }

        existing.url = newUrl;
        existing.reliability = 'yellow';
        existing.needsCheck = true;
        sourceUpdated++;
      }
    }
  });
  
  console.log(`Updated from ${path.basename(source.path)}: ${sourceUpdated}`);
  totalUpdated += sourceUpdated;
});

console.log(`Total games updated: ${totalUpdated}`);
fs.writeFileSync(CATALOG_PATH, JSON.stringify(games, null, 2) + '\n');
console.log(`Saved catalog.`);
