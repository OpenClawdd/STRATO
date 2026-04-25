import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs/promises";

const execAsync = promisify(exec);
const scriptPath = path.resolve("expand-library.js");

export async function runAutoUpdate() {
	try {
        // Run expand-library.js using node
		console.log("[Auto-Update] Running game library expansion...");
		const { stdout, stderr } = await execAsync(`node "${scriptPath}"`);
		if (stdout) console.log(`[Auto-Update] Output:\n${stdout}`);
		if (stderr) console.error(`[Auto-Update] Error Output:\n${stderr}`);
		console.log("[Auto-Update] Expansion completed successfully.");
	} catch (error) {
		console.error(`[Auto-Update] Failed to update games: ${error.message}`);
	}
}
