import fs from "fs/promises";
import path from "path";
import axios from "axios";

const ASSETS_DIR = path.join(process.cwd(), "public", "assets");
const GAMES_JSON = path.join(ASSETS_DIR, "games.json");

async function checkGames() {
	console.log("🏥 Starting Game Health Check...");

	let games = [];
	try {
		const raw = await fs.readFile(GAMES_JSON, "utf8");
		games = JSON.parse(raw);
	} catch (e) {
		console.error("❌ games.json not found.");
		return;
	}

	console.log(`Checking ${games.length} games...`);

	const results = {
		online: 0,
		offline: 0,
		broken: [],
	};

	// Check games in parallel with a limit
	const limit = 10;
	for (let i = 0; i < games.length; i += limit) {
		const batch = games.slice(i, i + limit);
		await Promise.all(
			batch.map(async (game) => {
				const url = game.iframe_url || game.url;
				if (!url) {
					results.broken.push({ title: game.title, error: "No URL" });
					results.offline++;
					return;
				}

				try {
					// Some games might block head requests or have CORS issues if run from local
					// But we'll try a simple get with a timeout
					await axios.get(url, { timeout: 5000, headers: { "User-Agent": "Mozilla/5.0" } });
					results.online++;
				} catch (e) {
					// We'll be lenient because some sites might block bots but still work in browser
					if (e.response && e.response.status < 500) {
						results.online++; // Likely alive but blocking bot
					} else {
						results.offline++;
						results.broken.push({ title: game.title, url, error: e.message });
					}
				}
			})
		);
		process.stdout.write(`Progress: ${Math.min(i + limit, games.length)}/${games.length}\r`);
	}

	console.log("\n\n📊 Health Check Report:");
	console.log(`✅ Online: ${results.online}`);
	console.log(`❌ Offline/Broken: ${results.offline}`);

	if (results.broken.length > 0) {
		console.log("\n⚠️ Broken Games List:");
		results.broken.slice(0, 10).forEach((b) => console.log(`- ${b.title}: ${b.error}`));
		if (results.broken.length > 10) console.log(`... and ${results.broken.length - 10} more.`);
	}

	// Optionally save the report
	await fs.writeFile("health-report.json", JSON.stringify(results, null, 4));
}

checkGames().catch(console.error);
