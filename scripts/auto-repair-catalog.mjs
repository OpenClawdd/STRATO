import fs from 'node:fs';
import path from 'node:path';

const catalogPath = 'public/assets/games.json';
const healthPath = '.strato-reports/catalog-source-health.json';
const adfreePath = '.strato-reports/repair/adfree-games.json';

if (!fs.existsSync(catalogPath)) {
  console.error('❌ Could not find games.json');
  process.exit(1);
}
if (!fs.existsSync(healthPath)) {
  console.error('❌ Could not find catalog-source-health.json');
  process.exit(1);
}
if (!fs.existsSync(adfreePath)) {
  console.error('❌ Could not find adfree-games.json');
  process.exit(1);
}

const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const healthData = JSON.parse(fs.readFileSync(healthPath, 'utf8'));
const adfreeData = JSON.parse(fs.readFileSync(adfreePath, 'utf8'));

// Helper to normalize names for matching
function normalize(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

// Build mirror map from adfree
const mirrors = new Map();
adfreeData.forEach(item => {
  if (item.name && item.url) {
    const key = normalize(item.name);
    let resolvedUrl = item.url;
    if (resolvedUrl.startsWith('/')) {
      resolvedUrl = 'https://adfree-sz-games.github.io' + resolvedUrl;
    }
    mirrors.set(key, resolvedUrl);
  }
});

// Build health map
const healthMap = new Map();
healthData.forEach(item => {
  healthMap.set(item.id, item.status);
});

let repairedCount = 0;
let quarantinedCount = 0;
let untouchedCount = 0;

const updatedCatalog = catalog.map(game => {
  const status = healthMap.get(game.id) || 'ok';

  // If the game is verified local, don't touch it
  if (game.reliability === 'green') {
    untouchedCount++;
    return game;
  }

  // If the game is already quarantined or has a failing health status
  if (status !== 'ok') {
    const key = normalize(game.name || game.title);
    const mirrorUrl = mirrors.get(key);

    if (mirrorUrl) {
      console.log(`[REPAIR] ${game.name || game.title} (${game.id}): ${game.url} -> ${mirrorUrl}`);
      repairedCount++;
      return {
        ...game,
        url: mirrorUrl,
        reliability: 'yellow' // Set as remote unverified/recently imported
      };
    } else {
      console.log(`[QUARANTINE] ${game.name || game.title} (${game.id}): ${game.url}`);
      quarantinedCount++;
      return {
        ...game,
        reliability: 'red' // Set to red to quarantine and exclude from lists
      };
    }
  }

  untouchedCount++;
  return game;
});

// Write updated catalog back
fs.writeFileSync(catalogPath, JSON.stringify(updatedCatalog, null, 2) + '\n');

console.log('\n📊 Auto-Repair Summary:');
console.log(`- Repaired using mirrors: ${repairedCount}`);
console.log(`- Quarantined (set to red): ${quarantinedCount}`);
console.log(`- Untouched / Working: ${untouchedCount}`);
console.log('\nAll done!');
