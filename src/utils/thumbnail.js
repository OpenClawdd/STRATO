import fs from "fs/promises";
import path from "path";
import sharp from "sharp";
import { Buffer } from "node:buffer";

export function safeName(name) {
	return name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/_$/, "");
}

export async function downloadThumbnail(name, thumbsDir) {
	const slug = safeName(name);
	const destPath = path.join(thumbsDir, `${slug}.webp`);
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
