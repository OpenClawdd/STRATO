#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const sitesPath = path.join(root, "public", "assets", "sites.json");
const errors = [];

function fail(message) {
  errors.push(message);
}

function normalizeUrl(url) {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    parsed.searchParams.sort();
    return parsed.toString().replace(/\/$/, "").toLowerCase();
  } catch {
    return "";
  }
}

let sites;
try {
  sites = JSON.parse(fs.readFileSync(sitesPath, "utf8"));
} catch (error) {
  fail(`Invalid JSON: ${error.message}`);
}

if (!Array.isArray(sites)) {
  fail("sites.json must be an array");
} else {
  const ids = new Map();
  const urls = new Map();
  sites.forEach((site, index) => {
    const label = site?.id || `index ${index}`;
    if (!site || typeof site !== "object") {
      fail(`${label}: entry must be an object`);
      return;
    }
    if (!site.id || typeof site.id !== "string") fail(`${label}: missing id`);
    if (!site.name || typeof site.name !== "string" || !site.name.trim())
      fail(`${label}: missing name`);
    if (!site.url || typeof site.url !== "string") {
      fail(`${label}: missing url`);
    } else {
      const placeholder = /^\$\{[A-Z0-9_]+\}$/.test(site.url);
      if (placeholder && !site.config_required)
        fail(`${label}: placeholder URL must be config_required`);
      if (!placeholder) {
        if (!/^https?:\/\//i.test(site.url)) fail(`${label}: URL must start with http(s)`);
        if (/https?:\/\/[^/\s]+\/https?:\/\//i.test(site.url))
          fail(`${label}: malformed joined URL`);
        const normalized = normalizeUrl(site.url);
        if (!normalized) fail(`${label}: invalid URL`);
        else if (urls.has(normalized))
          fail(`${label}: duplicate URL with ${urls.get(normalized)}`);
        else urls.set(normalized, label);
      }
    }
    if (site.id) {
      if (ids.has(site.id)) fail(`${label}: duplicate id with ${ids.get(site.id)}`);
      else ids.set(site.id, label);
    }
  });
}

if (errors.length) {
  console.error(`[validate-sites] ${errors.length} error(s)`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`[validate-sites] OK: ${sites.length} sites`);
