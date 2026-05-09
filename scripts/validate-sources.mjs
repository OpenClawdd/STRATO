#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const VALID_SOURCE_TYPES = new Set(['game-hub', 'math-tool', 'proxy', 'tool', 'personal', 'unknown']);
const VALID_STATUSES = new Set(['unchecked', 'healthy', 'stale', 'broken', 'duplicate', 'quarantined']);

const SAFE_URL_RE = /^https?:\/\//i;
const GOOGLE_SITES_RE = /sites\.google\.com/i;

const ingestedPath = path.join(__dirname, 'output', 'raw-sources.ingested.json');
const quarantinePath = path.join(__dirname, 'output', 'raw-sources.quarantine.json');
const reportPath = path.join(__dirname, 'output', 'raw-sources.report.json');

async function readJson(file) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

function validateEntry(entry, index, seenIds, seenUrls) {
  const issues = [];
  const { id, title, normalizedUrl, sourceType, status, launchable, promotable, rawUrl } = entry;

  if (!id || typeof id !== 'string') {
    issues.push({ severity: 'error', type: 'missing-id', id, message: `Entry ${index}: missing or invalid id` });
  } else if (seenIds.has(id)) {
    issues.push({ severity: 'error', type: 'duplicate-id', id, message: `id "${id}" is duplicated` });
  } else if (id) {
    seenIds.add(id);
  }

  if (!title || typeof title !== 'string' || !title.trim()) {
    issues.push({ severity: 'error', type: 'missing-title', id, message: `Entry ${index}: missing or empty title` });
  }

  if (!normalizedUrl || typeof normalizedUrl !== 'string' || !normalizedUrl.trim()) {
    issues.push({ severity: 'error', type: 'missing-url', id: id || index, message: `Entry ${index}: missing normalizedUrl` });
  } else if (!SAFE_URL_RE.test(normalizedUrl)) {
    issues.push({ severity: 'error', type: 'invalid-url', id, message: `"${title}": normalizedUrl "${normalizedUrl}" is not a valid HTTP(S) URL` });
  } else if (seenUrls.has(normalizedUrl)) {
    issues.push({ severity: 'warning', type: 'duplicate-url', id, message: `"${title}": normalizedUrl "${normalizedUrl}" is a duplicate` });
  } else {
    seenUrls.add(normalizedUrl);
  }

  if (!sourceType || !VALID_SOURCE_TYPES.has(sourceType)) {
    issues.push({ severity: 'warning', type: 'unknown-source-type', id, message: `"${title}": sourceType "${sourceType}" is not recognized` });
  }

  if (status && !VALID_STATUSES.has(status)) {
    issues.push({ severity: 'warning', type: 'invalid-status', id, message: `"${title}": status "${status}" is not valid (must be one of: ${[...VALID_STATUSES].join(', ')})` });
  }

  if (launchable === true) {
    if (status === 'broken' || status === 'quarantined' || status === 'duplicate') {
      issues.push({ severity: 'error', type: 'launchable-bad-status', id, message: `"${title}": launchable=true on ${status} source` });
    }
    if (!normalizedUrl || !SAFE_URL_RE.test(normalizedUrl)) {
      issues.push({ severity: 'error', type: 'launchable-missing-url', id, message: `"${title}": launchable=true but url is invalid` });
    }
  }

  if (promotable === true) {
    if (status !== 'healthy' && status !== 'unchecked') {
      issues.push({ severity: 'error', type: 'promotable-bad-status', id, message: `"${title}": promotable=true but status is "${status}"` });
    }
    if (launchable !== true) {
      issues.push({ severity: 'warning', type: 'promotable-not-launchable', id, message: `"${title}": promotable=true but launchable is not true` });
    }
    if (!title || title.length < 2) {
      issues.push({ severity: 'warning', type: 'promotable-weak-title', id, message: `"${title}": promotable=true but title is too short for promotion` });
    }
  }

  if (rawUrl && GOOGLE_SITES_RE.test(rawUrl)) {
    issues.push({ severity: 'warning', type: 'google-sites', id, message: `"${title}": Google Sites URL — needs manual review` });
  }

  return issues;
}

function groupIssues(issues) {
  const groups = new Map();
  for (const issue of issues) {
    if (!groups.has(issue.type)) groups.set(issue.type, []);
    groups.get(issue.type).push(issue);
  }
  return groups;
}

async function main() {
  const ingested = await readJson(ingestedPath);
  const quarantine = await readJson(quarantinePath);
  let report;
  try {
    report = JSON.parse(await fs.readFile(reportPath, 'utf8'));
  } catch { report = null; }

  if (!Array.isArray(ingested)) {
    console.error('[validate-sources] raw-sources.ingested.json is not an array');
    process.exitCode = 1;
    return;
  }

  const allIssues = [];
  const seenIds = new Set();
  const seenUrls = new Set();

  for (let i = 0; i < ingested.length; i++) {
    allIssues.push(...validateEntry(ingested[i], i, seenIds, seenUrls));
  }

  // Cross-check report
  if (report) {
    if (report.totalIngested !== ingested.length + quarantine.length) {
      allIssues.push({
        severity: 'error', type: 'report-mismatch', id: '',
        message: `Report totalIngested (${report.totalIngested}) != ingested (${ingested.length}) + quarantine (${quarantine.length})`,
      });
    }
    if (report.reviewable !== ingested.length) {
      allIssues.push({
        severity: 'warning', type: 'report-mismatch', id: '',
        message: `Report reviewable (${report.reviewable}) != ingested entries (${ingested.length})`,
      });
    }
    if (report.quarantined !== quarantine.length) {
      allIssues.push({
        severity: 'warning', type: 'report-mismatch', id: '',
        message: `Report quarantined (${report.quarantined}) != quarantine file length (${quarantine.length})`,
      });
    }
  }

  // Output
  const errorCount = allIssues.filter(i => i.severity === 'error').length;
  const warningCount = allIssues.filter(i => i.severity === 'warning').length;
  const groups = groupIssues(allIssues);

  console.log(`\nSource Hydra validation`);
  console.log(`Entries: ${ingested.length} ingested, ${quarantine.length} quarantined`);
  console.log(`Issues:  ${errorCount} errors, ${warningCount} warnings`);

  if (allIssues.length === 0) {
    console.log('No issues found.');
    return;
  }

  for (const [type, group] of groups) {
    const sev = group[0].severity === 'error' ? 'ERR' : 'WARN';
    console.log(`\n  [${sev}] ${type} (${group.length})`);
    for (const issue of group.slice(0, 8)) {
      console.log(`    ${issue.message}`);
    }
    if (group.length > 8) console.log(`    ... ${group.length - 8} more`);
  }

  if (errorCount > 0) process.exitCode = 1;
}

main().catch(err => {
  console.error(`[validate-sources] ${err.message}`);
  process.exitCode = 1;
});