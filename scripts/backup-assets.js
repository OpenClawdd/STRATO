import fs from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";

const sourceDir = path.resolve(process.cwd(), "public/assets");
// Using a safe external location like /tmp/strato-backups/
const destDir = path.resolve("/tmp/strato-backups");

if (!fs.existsSync(destDir)) {
	fs.mkdirSync(destDir, { recursive: true });
}

const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const zipName = `assets-backup-${timestamp}.zip`;
const destPath = path.join(destDir, zipName);

try {
	// Zip the assets folder. `cd` into public to avoid zipping the full absolute path
	console.log(`Zipping ${sourceDir} to ${destPath}...`);
	execSync(`cd public && zip -r ${destPath} assets`);
	console.log("Backup complete.");
} catch (error) {
	console.error("Failed to backup assets:", error.message);
	process.exit(1);
}
