import { describe, expect, it } from 'vitest';
import {
  duplicateReason,
  normalizeCandidate,
  normalizeUrl,
  parseHealthStatus,
  quarantineReason,
  splitCandidates,
  summarizeCatalog,
  validateRegistry,
} from '../scripts/source-radar-lib.mjs';

const reviewSource = {
  name: 'Example Directory',
  url: 'https://source.test/games/',
  aliases: ['example'],
  type: 'game-directory',
  priority: 'medium',
  status: 'review',
  importMode: 'metadata-only',
  allowAutoMerge: false,
  licenseStatus: 'review',
  notes: 'Review only.',
};

const disabledSource = {
  ...reviewSource,
  name: 'Disabled Source',
  status: 'disabled',
  importMode: 'disabled',
};

describe('Source Radar registry and health helpers', () => {
  it('validates the source registry shape and requires allowAutoMerge=false', () => {
    expect(validateRegistry([reviewSource])).toEqual([]);
    expect(validateRegistry([{ ...reviewSource, allowAutoMerge: true }])).toContain('Example Directory: allowAutoMerge must be false');
  });

  it('normalizes URLs for dedupe and status checks', () => {
    expect(normalizeUrl('HTTPS://www.Example.com/games///2048/?b=2&a=1#top')).toBe('https://example.com/games/2048?a=1&b=2');
  });

  it('parses source health statuses for active, redirected, blocked, and dead sources', () => {
    expect(parseHealthStatus({ status: 200, url: 'https://a.test', finalUrl: 'https://a.test' })).toBe('active');
    expect(parseHealthStatus({ status: 200, redirected: true, url: 'https://a.test', finalUrl: 'https://b.test' })).toBe('redirected');
    expect(parseHealthStatus({ status: 403 })).toBe('blocked');
    expect(parseHealthStatus({ error: 'timeout' })).toBe('timeout');
    expect(parseHealthStatus({ status: 500 })).toBe('dead');
  });
});

describe('Source Radar candidate policy', () => {
  it('normalizes candidates with source metadata, scores, and review policy', () => {
    const candidate = normalizeCandidate({ title: 'Example Game', url: '/play', tags: 'puzzle,logic', licenseStatus: 'review' }, reviewSource);
    expect(candidate.sourceName).toBe('Example Directory');
    expect(candidate.url).toBe('https://source.test/play');
    expect(candidate.tags).toEqual(['puzzle', 'logic']);
    expect(candidate.confidenceScore).toBeGreaterThanOrEqual(50);
  });

  it('detects duplicate URLs and fuzzy duplicate titles', () => {
    const seen = new Set();
    const first = { title: 'Space Runner', url: 'https://source.test/space-runner' };
    const second = { title: 'Space Runner Online', url: 'https://source.test/space-runner/' };
    expect(duplicateReason(first, seen, [])).toBe('');
    expect(duplicateReason(second, seen, [])).toMatch(/duplicate/);
  });

  it('quarantines unknown-license, disabled-source, and proxy-looking candidates', () => {
    expect(quarantineReason({ title: 'Unknown Game', url: 'https://source.test/game', licenseStatus: 'unknown', launchabilityScore: 80 }, reviewSource)).toBe('unclear-license');
    expect(quarantineReason({ title: 'Disabled Game', url: 'https://source.test/game', licenseStatus: 'review', launchabilityScore: 80 }, disabledSource)).toBe('source-disabled');
    expect(quarantineReason({ title: 'Proxy Mirror', url: 'https://example.com/proxy', licenseStatus: 'review', launchabilityScore: 80 }, reviewSource)).toBe('proxy-or-bypass-surface');
  });

  it('splits approved review candidates from quarantined entries', () => {
    const good = normalizeCandidate({ title: 'Clean Game', url: 'https://source.test/clean', licenseStatus: 'review', description: 'Playable puzzle' }, reviewSource);
    const bad = normalizeCandidate({ title: 'Unknown License Game', url: 'https://source.test/unknown', licenseStatus: 'unknown' }, reviewSource);
    const result = splitCandidates([good, bad], [reviewSource], []);
    expect(result.review.map(entry => entry.title)).toEqual(['Clean Game']);
    expect(result.quarantine.map(entry => entry.title)).toEqual(['Unknown License Game']);
  });

  it('summarizes catalog reports for review workload', () => {
    const report = summarizeCatalog({
      sources: [reviewSource, disabledSource],
      review: [{ title: 'Clean Game', sourceName: 'Example Directory', licenseStatus: 'review' }],
      quarantine: [{ title: 'Clean Game', quarantineReason: 'duplicate-title', licenseStatus: 'unknown' }],
    });
    expect(report.totalSources).toBe(2);
    expect(report.sourcesByStatus.review).toBe(1);
    expect(report.quarantineByReason['duplicate-title']).toBe(1);
    expect(report.topRepeatedTitles[0]).toEqual({ title: 'clean', count: 2 });
  });
});
