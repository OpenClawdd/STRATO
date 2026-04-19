/**
 * expand-library.js
 *
 * Fetches additional games from open-source unblocked game lists,
 * deduplicates against the existing public/assets/games.json,
 * downloads thumbnails via sharp, and merges into the local library.
 *
 * Usage:  node expand-library.js
 */

import fs from "fs/promises";
import path from "path";
import sharp from "sharp";
import { fileURLToPath } from "url";

const ASSETS_DIR = path.join(process.cwd(), "public", "assets");
const THUMBS_DIR = path.join(ASSETS_DIR, "thumbnails");
const GAMES_JSON = path.join(ASSETS_DIR, "games.json");

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Hardcoded expansion list.
 * These are popular unblocked games that were previously loaded from the
 * now-dead 3kh0 CDN, plus extras to bulk out the library.
 */
const EXPANSION_GAMES = [
	{ n: "Retro Bowl", u: "https://retrobowl.eu.org/", t: "Sports" },
	{ n: "Slope", u: "https://slope3d.io/", t: "Action" },
	{ n: "1v1.LOL", u: "https://1v1.lol/", t: "Shooter" },
	{ n: "Krunker.io", u: "https://krunker.io/", t: "Shooter" },
	{ n: "Happy Wheels", u: "https://happywheels.io/", t: "Action" },
	{ n: "Temple Run 2", u: "https://temple-run-2.io/", t: "Action" },
	{ n: "Stickman Hook", u: "https://stickman-hook.com/", t: "Casual" },
	{ n: "Chrome Dino", u: "https://chromedino.com/", t: "Classic" },
	{ n: "Slither.io", u: "https://slither.io/", t: "Multiplayer" },
	{ n: "Diep.io", u: "https://diep.io/", t: "Multiplayer" },
	{ n: "Paper.io 2", u: "https://paper-io.com/", t: "Arcade" },
	{ n: "Vex 7", u: "https://vex7.io/", t: "Platformer" },
	{ n: "OvO", u: "https://ovo.io/", t: "Platformer" },
	{ n: "Gunspin", u: "https://gunspin.io/", t: "Action" },
	{ n: "Tunnel Rush", u: "https://tunnelrush.io/", t: "Action" },
	{ n: "A Small World Cup", u: "https://asmallworldcup.com/", t: "Sports" },
	{ n: "House of Hazards", u: "https://houseofhazards.io/", t: "Multiplayer" },
	{ n: "Learn to Fly 3", u: "https://learntofly3.io/", t: "Arcade" },
	{ n: "Age of War", u: "https://ageofwar.io/", t: "Strategy" },
	{ n: "Raft Wars", u: "https://raftwars.io/", t: "Action" },
	{ n: "Tetris", u: "https://tetris.com/play-tetris", t: "Classic" },
	{ n: "Papa's Pizzeria", u: "https://papaspizzeria.io/", t: "Cooking" },
	{ n: "Bloons TD", u: "https://bloons-td.com/", t: "Strategy" },
	{ n: "Idle Breakout", u: "https://idlebreakout.io/", t: "Idle" },
	{ n: "Eggy Car", u: "https://eggycar.io/", t: "Casual" },
	{ n: "Drive Mad", u: "https://drivemad.io/", t: "Racing" },
	{ n: "Rocket League 2D", u: "https://rocketleague2d.io/", t: "Sports" },
	{ n: "Bob the Robber", u: "https://bobtherobber.io/", t: "Adventure" },
	{ n: "Cut the Rope", u: "https://cuttherope.io/", t: "Puzzle" },
	{ n: "Duck Life", u: "https://ducklife.io/", t: "Simulation" },
	{ n: "Fireboy and Watergirl", u: "https://fireboyandwatergirl.io/", t: "Puzzle" },
	{ n: "Tanuki Sunset", u: "https://tanukisunset.io/", t: "Arcade" },
];

export function safeName(name) {
	return name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/_$/, "");
}

async function downloadThumbnail(name) {
	const slug = safeName(name);
	const destPath = path.join(THUMBS_DIR, `${slug}.webp`);
	const localUrl = `/assets/thumbnails/${slug}.webp`;

	// Skip if already downloaded
	try {
		await fs.access(destPath);
		console.log(`  ⏭  Thumbnail exists: ${slug}.webp`);
		return localUrl;
	} catch { /* doesn't exist, continue */ }

	// Try to fetch a thumbnail from Google Images via a simple search
	// Fall back to generating a placeholder via sharp
	try {
		const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(name + " game logo")}&tbm=isch&tbs=isz:m`;
		const res = await fetch(searchUrl, {
			headers: {
				"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
			},
			signal: AbortSignal.timeout(8000),
		});
		const html = await res.text();

		// Extract first image URL from Google Images HTML
		const match = html.match(/\["(https?:\/\/[^"]+\.(?:jpg|jpeg|png|webp))",\d+,\d+\]/i);
		if (match) {
			const imgRes = await fetch(match[1], { signal: AbortSignal.timeout(8000) });
			if (imgRes.ok) {
				const buf = Buffer.from(await imgRes.arrayBuffer());
				await sharp(buf)
					.resize(400, 225, { fit: "cover" })
					.webp({ quality: 78 })
					.toFile(destPath);
				console.log(`  ✓  Downloaded: ${slug}.webp`);
				return localUrl;
			}
		}
		throw new Error("No suitable image found");
	} catch (e) {
		// Generate a solid-color placeholder with the game initial
		console.log(`  ◇  Generating placeholder for: ${name} (${e.message})`);
		const initial = (name[0] || "?").toUpperCase();
		const hue = (name.charCodeAt(0) * 47) % 360;

		const svg = `<svg width="400" height="225" xmlns="http://www.w3.org/2000/svg">
			<rect width="400" height="225" fill="hsl(${hue}, 35%, 12%)"/>
			<text x="200" y="130" text-anchor="middle" font-family="monospace" font-size="80" font-weight="bold" fill="hsl(${hue}, 60%, 40%)" opacity="0.5">${initial}</text>
			<text x="200" y="175" text-anchor="middle" font-family="sans-serif" font-size="16" fill="hsl(${hue}, 30%, 50%)">${name}</text>
		</svg>`;

		await sharp(Buffer.from(svg))
			.webp({ quality: 78 })
			.toFile(destPath);
		return localUrl;
	}
}

async function main() {
	console.log("═══ STRATO Library Expander ═══\n");

	// Ensure directories exist
	await fs.mkdir(THUMBS_DIR, { recursive: true });

	// Load existing library
	let existing = [];
	try {
		const raw = await fs.readFile(GAMES_JSON, "utf8");
		existing = JSON.parse(raw);
		console.log(`Loaded ${existing.length} existing games from games.json`);
	} catch {
		console.log("No existing games.json found, starting fresh");
	}

	// Build a set of existing game names (lowercase) for dedup
	const existingNames = new Set(existing.map((g) => (g.n || "").toLowerCase().trim()));

	// Filter expansion list to only new games
	const newGames = EXPANSION_GAMES.filter(
		(g) => !existingNames.has(g.n.toLowerCase().trim())
	);

	console.log(`\nFound ${newGames.length} new games to add\n`);

	if (newGames.length === 0) {
		console.log("Library is already up to date. Nothing to do.");
		return;
	}

	const results = [];

	for (const game of newGames) {
		console.log(`Processing: ${game.n}`);
		try {
			const img = await downloadThumbnail(game.n);
			results.push({ ...game, img });
		} catch (e) {
			console.error(`  ✗  Failed: ${game.n} — ${e.message}`);
			results.push({ ...game, img: null });
		}
		await delay(1500); // Rate limit
	}

	// Merge and write
	const merged = [...existing, ...results];
	await fs.writeFile(GAMES_JSON, JSON.stringify(merged, null, 4));

	console.log(`\n═══ Done ═══`);
	console.log(`Added ${results.length} games (${merged.length} total)`);
	console.log(`Saved to ${GAMES_JSON}`);
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
	main().catch((e) => {
		console.error("Fatal error:", e);
		process.exit(1);
	});
}
