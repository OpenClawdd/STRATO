function makeScores(n) {
  return Array.from({length: n}, (_, i) => ({
    username: `user${i}`,
    score: Math.random() * 1000000 | 0
  }));
}

function makeUsers(n) {
  return Array.from({length: n}, (_, i) => ({
    username: `user${i}`,
    xp: Math.random() * 10000 | 0,
    level: Math.random() * 100 | 0
  }));
}

const n = 50000;
const allScores = makeScores(n);
const allUsers = makeUsers(n);

let start = performance.now();
for (let i = 0; i < 50; i++) {
  const scores = [...allScores];
  scores.sort((a, b) => b.score - a.score);
  const top10 = scores.slice(0, 10);
}
let end = performance.now();
console.log(`Scores normal sort: ${(end - start).toFixed(2)}ms`);

start = performance.now();
for (let i = 0; i < 50; i++) {
  const users = [...allUsers];
  const sorted = users
      .map((u) => ({
        username: u.username,
        xp: u.xp || 0,
        level: u.level || 1,
        coins: u.coins || 0,
        avatar: u.avatar,
      }))
      .sort((a, b) => b.xp - a.xp)
      .slice(0, 25);
}
end = performance.now();
console.log(`Users map then sort: ${(end - start).toFixed(2)}ms`);

start = performance.now();
for (let i = 0; i < 50; i++) {
  const users = [...allUsers];
  const sorted = users
      .sort((a, b) => (b.xp || 0) - (a.xp || 0))
      .slice(0, 25)
      .map((u) => ({
        username: u.username,
        xp: u.xp || 0,
        level: u.level || 1,
        coins: u.coins || 0,
        avatar: u.avatar,
      }));
}
end = performance.now();
console.log(`Users sort then map: ${(end - start).toFixed(2)}ms`);
