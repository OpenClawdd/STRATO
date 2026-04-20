import fs from "fs/promises";
import path from "path";
import google from "googlethis";
import sharp from "sharp";
import { URL } from "url";

const htmlPath = path.resolve("public/index.html");
const thumbnailsDir = path.resolve("public/assets/thumbnails");

async function downloadImage(url) {
	const response = await fetch(url);
	if (!response.ok)
		throw new Error(`Failed to fetch image: ${response.statusText}`);
	const arrayBuffer = await response.arrayBuffer();
	return Buffer.from(arrayBuffer);
}

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

	const chunkSize = 5;
	for (let i = 0; i < games.length; i += chunkSize) {
		const chunk = games.slice(i, i + chunkSize);
		console.log(`Processing chunk ${Math.floor(i / chunkSize) + 1}...`);

		await Promise.all(
			chunk.map(async (game) => {
				console.log(`Processing ${game.n}...`);

				// 1. Fetch thumbnail
				const query = `${game.n} game capsule image high res`;
				console.log(`Searching for: ${query}`);
				try {
					const images = await google.image(query, { safe: false });
					if (images && images.length > 0) {
						const firstImage = images[0];
						console.log(`Found image URL for ${game.n}: ${firstImage.url}`);

						// 2. Download and process image
						const imageBuffer = await downloadImage(firstImage.url);

						const filename = `${game.n.toLowerCase().replace(/[^a-z0-9]+/g, "_")}.webp`;
						const filepath = path.join(thumbnailsDir, filename);

						await sharp(imageBuffer)
							.resize(400, 225, { fit: "cover" })
							.webp()
							.toFile(filepath);

						console.log(`Saved thumbnail to ${filepath}`);

						// 3. Update the string (thread safe operation within Promise.all)
						const newGameString = `{ n: "${game.n}", img: "/assets/thumbnails/${filename}", u: "${game.u}" }`;

						// Replace in the overall string safely (we rely on each originalString being unique)
						updatedGamesString = updatedGamesString.replace(
							game.originalString,
							newGameString
						);
					} else {
						console.warn(`No images found for ${game.n}`);
					}
				} catch (err) {
					console.error(`Error processing ${game.n}:`, err);
				}
			})
		);
		// Small delay to prevent rate-limiting, if needed, though chunking helps
		if (i + chunkSize < games.length) {
			await new Promise((resolve) => setTimeout(resolve, 1000));
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
