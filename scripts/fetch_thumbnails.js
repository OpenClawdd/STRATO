import fs from "fs/promises";
import path from "path";
import { downloadThumbnail } from "../src/utils/thumbnail.js";

const htmlPath = path.resolve("public/index.html");
const thumbnailsDir = path.resolve("public/assets/thumbnails");

async function main() {
	await fs.mkdir(thumbnailsDir, { recursive: true });

	let htmlContent = await fs.readFile(htmlPath, "utf-8");

	// Find the GAMES array
	const gamesRegex = /const GAMES = \[([\s\S]*?)\];/;
	const match = htmlContent.match(gamesRegex);
	if (!match) {
		console.error("Could not find GAMES array in index.html");
		return;
	}

	const gamesString = match[1];

	// Extract individual games
	const gameRegex =
		/{\s*n:\s*"([^"]+)",\s*e:\s*"([^"]+)",\s*u:\s*"([^"]+)"\s*}/g;

	const games = [];
	let m;
	while ((m = gameRegex.exec(gamesString)) !== null) {
		games.push({ n: m[1], e: m[2], u: m[3], originalString: m[0] });
	}

	console.log(`Found ${games.length} games.`);

	let updatedGamesString = gamesString;

	for (const game of games) {
		console.log(`Processing ${game.n}...`);

		try {
			const imgPath = await downloadThumbnail(game.n, thumbnailsDir);

			// 3. Update the string
			const newGameString = `{ n: "${game.n}", img: "${imgPath}", u: "${game.u}" }`;
			updatedGamesString = updatedGamesString.replace(
				game.originalString,
				newGameString
			);
		} catch (err) {
			console.error(`Error processing ${game.n}:`, err);
		}
	}

	// Replace GAMES array in HTML
	htmlContent = htmlContent.replace(gamesString, updatedGamesString);

	// Update buildGames function
	const buildGamesRegex = /div\.innerHTML\s*=\s*`(.*?)`;/;
	const oldInnerHTML =
		'<div class="card-icon">${g.e}</div><div class="card-label">${g.n}</div>';
	const newInnerHTML =
		'<img src="${g.img}" class="card-img" alt="${g.n}"><div class="card-label">${g.n}</div>';

	if (htmlContent.includes(oldInnerHTML)) {
		htmlContent = htmlContent.replace(oldInnerHTML, newInnerHTML);
	} else {
		console.warn(
			"Could not find innerHTML string to replace in buildGames function."
		);
	}

	// Add CSS for .card-img
	const styleRegex = /<\/style>/;
	const imgCss = `
			.card-img {
				width: 100%;
				height: 100%;
				object-fit: cover;
				border-radius: 8px;
			}
`;
	htmlContent = htmlContent.replace(styleRegex, imgCss + "		</style>");

	await fs.writeFile(htmlPath, htmlContent, "utf-8");
	console.log("Successfully updated index.html");
}

main().catch(console.error);
