import { test, expect } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const scriptsDir = path.resolve(__dirname, '../scripts');
const rawPath = path.join(scriptsDir, 'raw-sources.txt');
const ingestedPath = path.join(scriptsDir, 'output/raw-sources.ingested.json');
const quarantinePath = path.join(scriptsDir, 'output/raw-sources.quarantine.json');
const reportPath = path.join(scriptsDir, 'output/raw-sources.report.json');

let originalRawContent = '';

function runImporter() {
  execSync('node import-raw-sources.mjs', { cwd: scriptsDir, stdio: 'ignore' });
}

function runValidator() {
  try {
    execSync('node validate-sources.mjs', { cwd: scriptsDir, stdio: 'pipe' });
    return { ok: true };
  } catch (err) {
    return { ok: false, output: err.stdout.toString() };
  }
}

test('Source Hydra Import & Validation Edge Cases', async () => {
  // Backup existing
  try {
    originalRawContent = await fs.readFile(rawPath, 'utf8');
  } catch {
    originalRawContent = '';
  }

  try {
    // Setup edge cases
    const testData = [
      'https://example.com/path1 (Same Host Path 1)',
      'https://example.com/path2 (Same Host Path 2)',
      'https://example.com/path1 (Duplicate Path 1)', // Duplicate normalized URL
      'https://glued.comhttps://glued2.com (Glued URL Test)' // Glued URLs
    ].join('\n');
    await fs.writeFile(rawPath, testData, 'utf8');

    // Run importer
    runImporter();

    const ingested = JSON.parse(await fs.readFile(ingestedPath, 'utf8'));
    const quarantine = JSON.parse(await fs.readFile(quarantinePath, 'utf8'));

    // 1. Unique IDs for same host different path
    const path1 = ingested.find(e => e.normalizedUrl === 'https://example.com/path1');
    const path2 = ingested.find(e => e.normalizedUrl === 'https://example.com/path2');
    expect(path1).toBeDefined();
    expect(path2).toBeDefined();
    expect(path1.id).not.toBe(path2.id);
    expect(path1.id).toBeTruthy();

    // 2. Normalized URL dedupe
    const dupes = quarantine.filter(e => e.status === 'duplicate' && e.normalizedUrl === 'https://example.com/path1');
    expect(dupes.length).toBe(1);

    // 3. Glued URL splitting
    const glued1 = ingested.find(e => e.normalizedUrl === 'https://glued.com/');
    const glued2 = ingested.find(e => e.normalizedUrl === 'https://glued2.com/');
    expect(glued1).toBeDefined();
    expect(glued2).toBeDefined();

    // 4. Raw source output is not required in public assets
    // Check that public/assets doesn't contain the raw sources
    const publicAssetsDir = path.resolve(__dirname, '../public');
    const dirs = await fs.readdir(publicAssetsDir);
    expect(dirs.includes('raw-sources.txt')).toBe(false);

    // 5. Duplicate IDs fail validation
    const fakeIngested = [...ingested, { ...path1, normalizedUrl: 'https://other.com/path1', rawUrl: 'https://other.com/path1' }];
    await fs.writeFile(ingestedPath, JSON.stringify(fakeIngested));

    const valResult = runValidator();
    expect(valResult.ok).toBe(false);
    expect(valResult.output).toContain('duplicate-id');
    expect(valResult.output).toContain(path1.id);

  } finally {
    // Restore
    if (originalRawContent) {
      await fs.writeFile(rawPath, originalRawContent, 'utf8');
      runImporter(); // Restore output state
    } else {
      await fs.unlink(rawPath).catch(() => {});
    }
  }
});
