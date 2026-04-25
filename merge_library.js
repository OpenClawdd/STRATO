import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const SCRAPED_GAMES_FILE = 'scraped_games.json';
const EXISTING_GAMES_FILE = 'public/assets/games.json';

const KEYWORD_MAP = {
    racing: ['car', 'racing', 'drift', 'speed', 'kart'],
    shooter: ['shoot', 'gun', 'bullet', 'sniper', 'war'],
    puzzle: ['puzzle', 'match', 'block', 'sudoku', 'tetris'],
    adventure: ['adventure', 'quest', 'rpg', 'dungeon'],
    sports: ['soccer', 'football', 'basketball', 'tennis'],
    io: ['.io', 'agar', 'slither']
};

function normalizeUrl(url) {
    if (!url) return '';
    return url.toLowerCase().replace(/\/$/, '');
}

function normalizeTitle(title) {
    if (!title) return '';
    return title.toLowerCase().replace(/[^\w\s]|_/g, '').replace(/\s+/g, ' ').trim();
}

function inferCategory(title) {
    const lowerTitle = title.toLowerCase();
    for (const [category, keywords] of Object.entries(KEYWORD_MAP)) {
        for (const keyword of keywords) {
            if (lowerTitle.includes(keyword)) {
                return category;
            }
        }
    }
    return 'other';
}

function readJsonFile(filePath) {
    try {
        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(data);
        }
    } catch (e) {
        console.error(`Error reading ${filePath}: ${e}`);
    }
    return [];
}

function main() {
    console.log('--- Merging Library ---');
    const existingGames = readJsonFile(EXISTING_GAMES_FILE);
    const scrapedGames = readJsonFile(SCRAPED_GAMES_FILE);

    if (!Array.isArray(existingGames)) {
        console.error('Existing games data is not an array. Aborting.');
        process.exit(1);
    }
    if (!Array.isArray(scrapedGames)) {
        console.error('Scraped games data is not an array. Aborting.');
        process.exit(1);
    }

    const seenUrls = new Set(existingGames.map(g => normalizeUrl(g.url || g.iframe_url || g.u)).filter(u => u));
    const seenTitles = new Set(existingGames.map(g => normalizeTitle(g.title || g.n)).filter(t => t));

    let addedCount = 0;
    let skippedCount = 0;

    for (const game of scrapedGames) {
        const normUrl = normalizeUrl(game.url);
        const normTitle = normalizeTitle(game.title);

        if (seenUrls.has(normUrl) || seenTitles.has(normTitle)) {
            skippedCount++;
            continue;
        }

        const newGame = {
            id: crypto.randomUUID(),
            title: game.title,
            url: game.url,
            thumbnailUrl: game.thumbnailUrl,
            category: game.category === 'other' || !game.category ? inferCategory(game.title) : game.category,
            tags: game.tags || [],
            source: game.source
        };

        existingGames.push(newGame);
        seenUrls.add(normUrl);
        seenTitles.add(normTitle);
        addedCount++;
    }

    try {
        fs.writeFileSync(EXISTING_GAMES_FILE, JSON.stringify(existingGames, null, 4), 'utf8');
        console.log(`Successfully wrote to ${EXISTING_GAMES_FILE}`);
    } catch (e) {
        console.error(`Error writing to ${EXISTING_GAMES_FILE}: ${e}`);
        process.exit(1);
    }

    console.log(`Summary:`);
    console.log(`${addedCount} new games added`);
    console.log(`${skippedCount} duplicates skipped`);
    console.log(`${existingGames.length} total games now in library`);
}

main();
