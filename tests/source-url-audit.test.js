import fs from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadSourceEvidence, buildSourceUrlAudit, repairSourceUrls } from '../scripts/source-url-audit.mjs';
import { buildSourceInventory, classifyCatalogEntry } from '../scripts/verify-sources.mjs';

describe('source URL audit and repair', () => {
  it('reports evidence-backed Selenite repairs and GN Math review-only entries', async () => {
    const games = JSON.parse(await fs.readFile('public/assets/games.json', 'utf8'));
    const evidence = await loadSourceEvidence();
    const report = buildSourceUrlAudit(games, evidence);

    const ultrakill = report.entries.find((entry) => entry.title === 'Ultrakill');
    expect(ultrakill?.source).toBe('selenite');
    expect(ultrakill?.evidenceUrl).toBe('https://selenite.cc/resources/semag/ultrakill/index.html');
    expect(ultrakill?.evidenceUrlExists).toBe(true);

    const bowmasters = report.entries.find((entry) => entry.title === 'Bowmasters');
    expect(bowmasters?.source).toBe('gn-math');
    expect(bowmasters?.needsReview).toBe(true);
    expect(bowmasters?.evidenceUrl).toBe('https://gn-math.dev/');
  });

  it('repairs Selenite project URLs and downgrades GN Math to review-only source URLs', async () => {
    const evidence = await loadSourceEvidence();
    const games = [
      {
        id: 'ultrakill',
        name: 'Ultrakill',
        provider: 'selenite',
        source: 'selenite',
        url: 'https://selenite.cc/projects/ultrakill',
        needsReview: false,
      },
      {
        id: 'bowmasters',
        name: 'Bowmasters',
        provider: 'gn-math',
        source: 'gn-math',
        url: 'https://gn-math.dev/#game-0',
        needsReview: false,
      },
    ];

    const repaired = repairSourceUrls(games, evidence);

    expect(repaired.counts.repairedSelenite).toBe(1);
    expect(repaired.counts.markedGnMathReview).toBe(1);
    expect(repaired.games[0].url).toBe('https://selenite.cc/resources/semag/ultrakill/index.html');
    expect(repaired.games[1].url).toBe('https://gn-math.dev/');
    expect(repaired.games[1].needsReview).toBe(true);
    expect(repaired.games[1].sourceWarning).toBe('gn-math-url-needs-review');
  });

  it('flags suspicious source URLs in validation', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'strato-source-'));
    const file = path.join(dir, 'games.json');
    await fs.writeFile(
      file,
      JSON.stringify(
        [
          {
            id: 'selenite-bad',
            name: 'Bad Selenite',
            provider: 'selenite',
            source: 'selenite',
            url: 'https://selenite.cc/projects/bad',
            category: 'games',
            description: 'Test entry',
            thumbnail: '/assets/thumb.png',
          },
          {
            id: 'gn-math-review',
            name: 'GN Math Review',
            provider: 'gn-math',
            source: 'gn-math',
            url: 'https://gn-math.dev/',
            needsReview: true,
            category: 'games',
            description: 'Test entry',
            thumbnail: '/assets/thumb.png',
          },
        ],
        null,
        2,
      ),
    );

    const output = execFileSync(process.execPath, ['scripts/validate-games.mjs', file], { encoding: 'utf8' });
    expect(output).toContain('selenite-project-url');
    expect(output).toContain('gn-math-url-needs-review');
  });
});

describe('source verifier trust classification', () => {
  it('verifies local public game paths by filesystem evidence', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'strato-local-source-'));
    await fs.mkdir(path.join(dir, 'public', 'games', 'ok'), { recursive: true });
    await fs.writeFile(path.join(dir, 'public', 'games', 'ok', 'index.html'), '<!doctype html>');

    const good = await classifyCatalogEntry(
      { id: 'ok', name: 'OK', url: '/games/ok/index.html', reliability: 'green' },
      { rootDir: dir },
    );
    const missing = await classifyCatalogEntry(
      { id: 'missing', name: 'Missing', url: '/games/missing/index.html', reliability: 'green' },
      { rootDir: dir },
    );

    expect(good.state).toBe('verified-local');
    expect(missing.state).toBe('broken');
  });

  it('classifies suspicious and review-only external candidates without trusting them', async () => {
    const inventory = await buildSourceInventory([
      {
        id: 'selenite-project',
        name: 'Selenite Project',
        provider: 'selenite',
        url: 'https://selenite.cc/projects/example',
      },
      {
        id: 'gn-review',
        name: 'GN Review',
        provider: 'gn-math',
        url: 'https://gn-math.dev/',
        needsReview: true,
      },
    ]);

    expect(inventory.entries.find((entry) => entry.id === 'selenite-project')?.state).toBe('suspicious');
    expect(inventory.entries.find((entry) => entry.id === 'gn-review')?.state).toBe('review-only');
    expect(inventory.sources.selenite.suspiciousUrlPatterns).toBe(1);
    expect(inventory.sources['gn-math'].reviewOnly).toBe(1);
  });
});
