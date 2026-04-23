/**
 * expand-library.js
 *
 * The Master Heist Engine for STRATO.
 * Fetches games from Selenite, 3kh0-lite, and more.
 * Deduplicates, normalizes, and maintains the library.
 *
 * Usage: node expand-library.js
 */

import fs from "fs/promises";
import path from "path";
import axios from "axios";
import sharp from "sharp";
import google from "googlethis";
import { fileURLToPath } from "url";

const ASSETS_DIR = path.join(process.cwd(), "public", "assets");
const THUMBS_DIR = path.join(ASSETS_DIR, "thumbnails");
const GAMES_JSON = path.join(ASSETS_DIR, "games.json");

const SOURCES = [
	{
		name: "Selenite Games",
		url: "https://gitlab.com/skysthelimit.dev/selenite/-/raw/main/data/games.json",
		type: "selenite",
		baseUrl: "https://selenite.cc/games/",
		imgBaseUrl: "https://selenite.cc/games/",
	},
	{
		name: "Selenite Apps",
		url: "https://gitlab.com/skysthelimit.dev/selenite/-/raw/main/data/apps.json",
		type: "selenite",
		baseUrl: "https://selenite.cc/apps/",
		imgBaseUrl: "https://selenite.cc/apps/",
	},
	{
		name: "3kh0-Lite",
		url: "https://raw.githubusercontent.com/3kh0/3kh0-lite/main/config/games.json",
		type: "3kh0",
		baseUrl: "https://3kh0.github.io/3kh0-lite/",
		imgBaseUrl: "https://3kh0.github.io/3kh0-lite/",
	},
];

const EXPANSION_GAMES = [
	{ n: "Retro Bowl", u: "https://retrobowl.eu.org/", t: "Sports" },
	{ n: "Slope", u: "https://slope3d.io/", t: "Action" },
	{ n: "1v1.LOL", u: "https://1v1.lol/", t: "Shooter" },
	{ n: "Krunker.io", u: "https://krunker.io/", t: "Shooter" },
	{ n: "Happy Wheels", u: "https://happywheels.io/", t: "Action" },
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
	{ n: "Age of War", u: "https://ageofwar.io/", t: "Strategy" },
	{ n: "Raft Wars", u: "https://raftwars.io/", t: "Action" },
	{ n: "Tetris", u: "https://tetris.com/play-tetris", t: "Classic" },
	{ n: "Papa's Pizzeria", u: "https://papaspizzeria.io/", t: "Cooking" },
	{ n: "Bloons TD", u: "https://bloons-td.com/", t: "Strategy" },
	{ n: "Idle Breakout", u: "https://idlebreakout.io/", t: "Idle" },
	{ n: "Eggy Car", u: "https://eggycar.io/", t: "Casual" },
	{ n: "Drive Mad", u: "https://drivemad.io/", t: "Racing" },
	{ n: "Bob the Robber", u: "https://bobtherobber.io/", t: "Adventure" },
	{ n: "Cut the Rope", u: "https://cuttherope.io/", t: "Puzzle" },
	{ n: "Duck Life", u: "https://ducklife.io/", t: "Simulation" },
	{ n: "Fireboy and Watergirl", u: "https://fireboyandwatergirl.io/", t: "Puzzle" },
	{ n: "Tanuki Sunset", u: "https://tanukisunset.io/", t: "Arcade" },
];

function safeName(name) {
	return name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "_")
		.replace(/_$/, "");
}

async function downloadThumbnail(name, remoteUrl) {
	const slug = safeName(name);
	const destPath = path.join(THUMBS_DIR, `${slug}.webp`);
	const localUrl = `/assets/thumbnails/${slug}.webp`;

	try {
		await fs.access(destPath);
		return localUrl;
	} catch {}

	try {
		let buffer;
		if (remoteUrl && remoteUrl.startsWith("http")) {
			const res = await axios.get(remoteUrl, { responseType: "arraybuffer", timeout: 5000 });
			buffer = Buffer.from(res.data);
		} else {
			// Fallback to Google Search if no remote URL or it fails
			const images = await google.image(name + " game logo", { safe: false });
			if (images && images.length > 0) {
				const res = await axios.get(images[0].url, { responseType: "arraybuffer", timeout: 5000 });
				buffer = Buffer.from(res.data);
			}
		}

		if (buffer) {
			await sharp(buffer)
				.resize(400, 250, { fit: "cover" })
				.webp({ quality: 80 })
				.toFile(destPath);
			console.log(`  ✓  Saved thumbnail: ${slug}.webp`);
			return localUrl;
		}
	} catch (e) {
		console.warn(`  ⚠️  Failed thumbnail for ${name}: ${e.message}`);
	}

	return "/assets/thumbnails/placeholder.webp";
}

function normalize(game, source) {
	let title = "Unknown";
	let remoteThumb = "";
	let url = "";
	let category = "Other";

	if (source.type === "selenite") {
		title = game.name || "Unknown";
		remoteThumb = source.imgBaseUrl + game.directory + "/" + (game.image || "cover.png");
		url = source.baseUrl + game.directory + "/";
	} else if (source.type === "3kh0") {
		title = game.title || "Unknown";
		remoteThumb = source.imgBaseUrl + game.imgSrc;
		url = source.baseUrl + game.link;
	} else {
		title = game.n || game.name || game.title || "Unknown";
		remoteThumb = game.img || game.thumbnail || "";
		url = game.u || game.url || game.iframe_url || "";
		category = game.t || game.category || "Other";
	}

	return {
		title: title.trim(),
		remoteThumb,
		iframe_url: url,
		source: source.name || "Expansion",
		category,
	};
}

async function main() {
	console.log("🚀 STRATO Master Heist Engine 🚀\n");

	await fs.mkdir(THUMBS_DIR, { recursive: true });

	let existing = [];
	try {
		const raw = await fs.readFile(GAMES_JSON, "utf8");
		existing = JSON.parse(raw);
	} catch (e) {
		console.log("Starting with empty library.");
	}

	const masterList = new Map();
	existing.forEach((g) => masterList.set(g.title.toLowerCase().trim(), g));

	// 1. Expansion Games
	EXPANSION_GAMES.forEach((g) => {
		const norm = normalize(g, { type: "expansion" });
		if (!masterList.has(norm.title.toLowerCase().trim())) {
			masterList.set(norm.title.toLowerCase().trim(), norm);
		}
	});

	// 2. Fetch from External Sources
	for (const source of SOURCES) {
		console.log(`📡 Heisting from ${source.name}...`);
		try {
			const res = await axios.get(source.url, { timeout: 15000 });
			const games = res.data;

			if (Array.isArray(games)) {
				games.forEach((g) => {
					const norm = normalize(g, source);
					if (norm.iframe_url && !masterList.has(norm.title.toLowerCase().trim())) {
						masterList.set(norm.title.toLowerCase().trim(), norm);
					}
				});
			}
		} catch (e) {
			console.warn(`⚠️  Failed to fetch ${source.name}: ${e.message}`);
		}
	}

	// 3. Process All (Download thumbs & finalize)
	const finalGames = [];
	const gamesArray = Array.from(masterList.values());
	
	console.log(`\n📦 Finalizing ${gamesArray.length} games...`);
	
	for (const g of gamesArray) {
		// Download thumbnail if it's still a remote URL
		if (!g.thumbnail || g.thumbnail.startsWith("http")) {
			g.thumbnail = await downloadThumbnail(g.title, g.remoteThumb);
		}
		delete g.remoteThumb; // Cleanup
		finalGames.push(g);
	}

	await fs.writeFile(GAMES_JSON, JSON.stringify(finalGames, null, 4));

	console.log(`\n✅ Heist Successful!`);
	console.log(`Total Library: ${finalGames.length} games (Added ${finalGames.length - existing.length} new)`);
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
	main().catch((e) => {
		console.error("Fatal Heist Error:", e);
		process.exit(1);
	});
}
