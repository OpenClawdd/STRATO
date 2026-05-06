#!/usr/bin/env node
import {
  gamesPath,
  quarantinePath,
  readJson,
  reviewPath,
  sourceHealthPath,
  sourcesPath,
  summarizeCatalog,
  validateRegistry,
} from './source-radar-lib.mjs';

function printObject(title, value) {
  console.log(`\n${title}`);
  const entries = Object.entries(value || {});
  if (!entries.length) {
    console.log('  none');
    return;
  }
  for (const [key, count] of entries.sort(([a], [b]) => a.localeCompare(b))) {
    console.log(`  ${key}: ${count}`);
  }
}

export async function buildCatalogReport() {
  const [sources, review, quarantine, games, health] = await Promise.all([
    readJson(sourcesPath, []),
    readJson(reviewPath, []),
    readJson(quarantinePath, []),
    readJson(gamesPath, []),
    readJson(sourceHealthPath, { results: [] }),
  ]);
  const registryErrors = validateRegistry(sources);
  const summary = summarizeCatalog({ sources, review, quarantine });
  const duplicateTitles = summary.topRepeatedTitles;
  return {
    generatedAt: new Date().toISOString(),
    registryErrors,
    totalGames: games.length,
    sourceHealthCheckedAt: health.generatedAt || '',
    ...summary,
    duplicateTitles,
    recommendedActions: [
      registryErrors.length ? 'Fix source registry validation errors before checking health.' : '',
      summary.unknownLicense ? 'Review or quarantine unknown-license candidates before merge.' : '',
      summary.totalQuarantined ? 'Inspect quarantine reasons and reject or repair candidates manually.' : '',
      summary.missingThumbnails ? 'Add local thumbnails or rely on STRATO fallback art for approved entries.' : '',
    ].filter(Boolean),
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const report = await buildCatalogReport();
  console.log('STRATO Source Radar report');
  console.log(`Generated: ${report.generatedAt}`);
  console.log(`Catalog games: ${report.totalGames}`);
  console.log(`Sources: ${report.totalSources}`);
  console.log(`Review candidates: ${report.totalCandidates}`);
  console.log(`Quarantined candidates: ${report.totalQuarantined}`);
  console.log(`Missing thumbnails: ${report.missingThumbnails}`);
  console.log(`Missing descriptions: ${report.missingDescriptions}`);
  console.log(`Unknown license: ${report.unknownLicense}`);
  printObject('Sources by status', report.sourcesByStatus);
  printObject('Candidates by source', report.candidatesBySource);
  printObject('Quarantine by reason', report.quarantineByReason);
  console.log('\nTop repeated titles');
  if (!report.topRepeatedTitles.length) console.log('  none');
  else report.topRepeatedTitles.forEach(item => console.log(`  ${item.title}: ${item.count}`));
  console.log('\nRecommended manual actions');
  if (!report.recommendedActions.length) console.log('  none');
  else report.recommendedActions.forEach(action => console.log(`  - ${action}`));
  if (report.registryErrors.length) {
    console.log('\nRegistry errors');
    report.registryErrors.forEach(error => console.log(`  - ${error}`));
    process.exitCode = 1;
  }
}
