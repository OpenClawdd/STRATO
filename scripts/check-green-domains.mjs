import fs from 'fs';
const games = JSON.parse(fs.readFileSync('public/assets/games.json', 'utf8'));
const green = games.filter(g => g.reliability === 'green');
const domains = {};
green.forEach(g => {
  try {
    const url = new URL(g.url, 'http://localhost:3000');
    const domain = url.hostname;
    domains[domain] = (domains[domain] || 0) + 1;
  } catch (e) {
    domains['invalid'] = (domains['invalid'] || 0) + 1;
  }
});
console.log(domains);
