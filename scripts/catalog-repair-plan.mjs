import fs from "node:fs";
import path from "node:path";

const catalogPath = "public/assets/games.json";
const healthPath = ".strato-reports/catalog-source-health.json";
const reportDir = ".strato-reports/repair";

if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });

if (!fs.existsSync(healthPath)) {
  console.error("❌ No health report found. Run source-doctor first.");
  process.exit(1);
}

const games = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
const healthData = JSON.parse(fs.readFileSync(healthPath, "utf8"));

const healthMap = new Map(healthData.map(item => [item.id, item]));

const redEntries = games.filter(g => g.reliability === "red");

const plan = redEntries.map(game => {
  const health = healthMap.get(game.id) || { status: "unknown", reason: "No health data" };

  let bucket = "E"; // Default: permanently remove/keep quarantined
  let candidateNotes = "";

  if (health.status === "dead_launch") {
    bucket = "B"; // Needs replacement source
    candidateNotes = "Check Selenite/Frogiee mirrors";
  } else if (health.status === "generic_only") {
    bucket = "A"; // Repairable direct launch URL exists (maybe?)
    candidateNotes = "Search for direct .html or /play route";
  } else if (health.status === "duplicate") {
    bucket = "D"; // Duplicate
  } else if (health.status === "missing_metadata") {
    bucket = "F"; // Needs metadata
  }

  return {
    id: game.id,
    title: game.name || game.title,
    currentUrl: game.url,
    failureReason: health.status,
    detailedReason: health.reason || "",
    repairBucket: bucket,
    candidateReplacementNotes: candidateNotes,
    verificationStatus: "pending"
  };
});

fs.writeFileSync(path.join(reportDir, "repair-backlog.json"), JSON.stringify(plan, null, 2));

// Summary Report
const buckets = {
  A: plan.filter(p => p.repairBucket === "A").length,
  B: plan.filter(p => p.repairBucket === "B").length,
  C: plan.filter(p => p.repairBucket === "C").length,
  D: plan.filter(p => p.repairBucket === "D").length,
  E: plan.filter(p => p.repairBucket === "E").length,
  F: plan.filter(p => p.repairBucket === "F").length,
};

const summary = `
# STRATO Catalog Repair Backlog

Total Quarantined: ${plan.length}

## Repair Buckets
- **A (Repairable URL exists)**: ${buckets.A} (Games pointing to generic homepages but likely have direct routes)
- **B (Needs replacement source)**: ${buckets.B} (Dead 404/Timeout links)
- **C (Needs self-hosted package)**: ${buckets.C} (Flash/Unity games needing local wrappers)
- **D (Duplicate)**: ${buckets.D} (Entries that exist elsewhere in catalog)
- **E (Permanent Quarantine)**: ${buckets.E} (Blocked content or irrecoverable)
- **F (Metadata Issues)**: ${buckets.F}

## Top 25 Priority Candidates for Repair
${plan.slice(0, 25).map(p => `- [ ] ${p.id}: ${p.title} (${p.failureReason})`).join("\n")}
`;

fs.writeFileSync(path.join(reportDir, "repair-summary.md"), summary);

console.log(`✅ Repair backlog generated with ${plan.length} entries.`);
console.log(`📊 Summary: ${reportDir}/repair-summary.md`);
