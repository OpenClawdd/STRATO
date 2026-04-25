import fs from 'fs';
import { execSync } from 'child_process';

const bumpType = process.argv[2];
if (!['patch', 'minor', 'major'].includes(bumpType)) {
    console.error('Usage: node release.mjs <patch|minor|major>');
    process.exit(1);
}

execSync(`npm version ${bumpType} --no-git-tag-version`, { stdio: 'inherit' });

const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
const newVersion = pkg.version;
const date = new Date().toISOString().split('T')[0];

console.log(`Updating to version v${newVersion}`);

let changelog = '';
try {
    changelog = fs.readFileSync('./CHANGELOG.md', 'utf8');
} catch (e) {
    changelog = '# Changelog\n\nAll notable changes to this project will be documented in this file.\n\n';
}

let gitLog = '';
try {
    const lastTag = execSync('git describe --tags --abbrev=0 2>/dev/null || git rev-list --max-parents=0 HEAD').toString().trim();
    gitLog = execSync(`git log ${lastTag}..HEAD --oneline`).toString();
} catch (e) {
    gitLog = execSync(`git log --oneline`).toString();
}

const logEntries = gitLog.split('\n').filter(l => l).map(l => `- ${l}`).join('\n');
const newLog = `## [v${newVersion}] - ${date}\n\n${logEntries}\n\n`;

const parts = changelog.split(/## \[v/);
let newChangelog = '';
if (parts.length > 1) {
    newChangelog = parts[0] + newLog + '## [v' + parts.slice(1).join('## [v');
} else {
    newChangelog = changelog + newLog;
}

fs.writeFileSync('./CHANGELOG.md', newChangelog);

const indexHtml = fs.readFileSync('./public/index.html', 'utf8');
const updatedHtml = indexHtml.replace(/<span class="tb-ver">v.*?<\/span>/g, `<span class="tb-ver">v${newVersion}</span>`);
fs.writeFileSync('./public/index.html', updatedHtml);

console.log(`Release v${newVersion} prepared. Review changes and commit.`);
