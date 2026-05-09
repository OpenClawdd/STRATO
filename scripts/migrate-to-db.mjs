import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import store from "../src/db/store.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrate() {
  console.log("Starting migration to Source Hydra DB...");
  store.initStore();

  const rawPath = path.join(__dirname, "raw-sources.txt");

  try {
    const rawContent = await fs.readFile(rawPath, "utf-8");
    const lines = rawContent.split("\n").map(l => l.trim()).filter(l => l && !l.startsWith("#"));

    let count = 0;
    for (const line of lines) {
      let url = line;
      let title = "";

      const parts = line.split(" ");
      if (parts.length > 1 && parts[0].startsWith("http")) {
        url = parts[0];
        title = parts.slice(1).join(" ");
        if (title.startsWith("(") && title.endsWith(")")) {
          title = title.substring(1, title.length - 1);
        }
      }

      await store.create("quarantine", {
        rawUrl: url,
        normalizedUrl: new URL(url).origin + new URL(url).pathname,
        title: title || "Unknown Source",
        sourceType: "proxy",
        status: "pending_review"
      });
      count++;
    }

    console.log(`Migrated ${count} raw sources into Quarantine Bay for Admin review.`);
  } catch (err) {
    console.error("Migration failed:", err);
  }
}

migrate();
