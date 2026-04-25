import fs from 'node:fs/promises';
import { join, basename, extname } from 'node:path';

/**
 * STRATO Game Importer v1.2 (Metadata Fix)
 * ========================================
 * Improved title parsing and image verification.
 */

const CONFIG_PATH = join(process.cwd(), 'public', 'config', 'games.json');
const GAMES_DIR = join(process.cwd(), 'public', 'games');
const PLACEHOLDER_IMG = 'https://raw.githubusercontent.com/OpenClawdd/STRATO/main/public/assets/placeholder.webp';

async function importGames() {
  try {
    console.log('🚀 Starting STRATO Game Import (Fix Mode)...');

    // Ensure config dir exists
    await fs.mkdir(join(process.cwd(), 'public', 'config'), { recursive: true });

    let games = [];
    try {
      const data = await fs.readFile(CONFIG_PATH, 'utf8');
      games = JSON.parse(data);
    } catch (e) {}

    const entries = await fs.readdir(GAMES_DIR, { withFileTypes: true });
    let addedCount = 0;
    const newLibrary = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const gameId = entry.name;
        const gamePath = join(GAMES_DIR, gameId);
        
        // Skip hidden folders
        if (gameId.startsWith('.')) continue;

        // Parse Title from folder name
        let name = gameId
          .replace(/-/g, ' ')
          .replace(/_/g, ' ')
          .replace(/\b\w/g, l => l.toUpperCase())
          .replace(/Lol/g, 'LOL')
          .replace(/Dot/g, '.')
          .trim();

        // Image verification
        const imageFiles = ['thumbnail.jpg', 'icon.png', 'splash.png', 'cover.webp', 'thumb.png'];
        let foundImg = PLACEHOLDER_IMG;

        for (const imgFile of imageFiles) {
          try {
            await fs.access(join(gamePath, imgFile));
            foundImg = `/games/${gameId}/${imgFile}`;
            break;
          } catch {}
        }

        newLibrary.push({
          id: gameId,
          name: name,
          url: `/games/${gameId}/index.html`,
          img: foundImg,
          category: 'Sandbox',
          t: 'HTML5'
        });
        addedCount++;
        console.log(`✅ ${name} -> ${foundImg}`);
      }
    }

    await fs.writeFile(CONFIG_PATH, JSON.stringify(newLibrary, null, 2));
    console.log(`\n🎉 Library rebuilt with ${addedCount} games.`);

  } catch (err) {
    console.error('❌ Import failed:', err.message);
  }
}

importGames();
