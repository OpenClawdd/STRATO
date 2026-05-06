#!/usr/bin/env node
import {
  checkSourceHealth,
  readJson,
  sourceHealthPath,
  sourcesPath,
  validateRegistry,
  writeJson,
} from './source-radar-lib.mjs';

function parseArgs(argv) {
  return {
    json: argv.includes('--json'),
    markDead: argv.includes('--mark-dead'),
  };
}

function applyHealthToSource(source, result, markDead) {
  const next = {
    ...source,
    lastChecked: result.checkedAt,
    health: result,
  };
  if (markDead && ['dead', 'timeout'].includes(result.status)) next.status = 'dead';
  else if (result.status === 'redirected') next.status = 'redirected';
  else if (result.status === 'blocked') next.status = 'blocked';
  else if (result.status === 'active' && source.status === 'dead') next.status = 'review';
  return next;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const sources = await readJson(sourcesPath, []);
  const registryErrors = validateRegistry(sources);
  if (registryErrors.length) {
    console.error('[check-sources] Source registry errors:');
    registryErrors.forEach(error => console.error(`- ${error}`));
    process.exitCode = 1;
    return;
  }

  const results = [];
  for (const source of sources) {
    const result = await checkSourceHealth(source);
    results.push(result);
    if (!args.json) {
      const redirect = result.redirected ? ` -> ${result.finalUrl}` : '';
      const http = result.httpStatus ? `HTTP ${result.httpStatus}` : result.error || 'not checked';
      console.log(`${source.name.padEnd(22)} ${result.status.padEnd(10)} ${http}${redirect}`);
    }
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    results,
  };
  await writeJson(sourceHealthPath, payload);

  if (args.markDead) {
    const updated = sources.map(source => applyHealthToSource(source, results.find(result => result.name === source.name), true));
    await writeJson(sourcesPath, updated);
  }

  if (args.json) console.log(JSON.stringify(payload, null, 2));
  else console.log(`\nSource health written: ${sourceHealthPath}`);
}

main().catch((err) => {
  console.error(`[check-sources] ${err.message}`);
  process.exitCode = 1;
});
