import { performance } from 'perf_hooks';

// Mock store data
const allUsers = Array.from({ length: 100000 }, (_, i) => ({
  username: `user_${i}`,
  xp: Math.floor(Math.random() * 10000),
  level: Math.floor(Math.random() * 100),
  coins: Math.floor(Math.random() * 5000),
  avatar: 'default.png',
  extra_field_1: 'some_data',
  extra_field_2: 'more_data'
}));

function oldMethod() {
  const sorted = allUsers
    .map((u) => ({
      username: u.username,
      xp: u.xp || 0,
      level: u.level || 1,
      coins: u.coins || 0,
      avatar: u.avatar,
    }))
    .sort((a, b) => b.xp - a.xp)
    .slice(0, 25);

  return sorted.map((u, i) => ({
    rank: i + 1,
    ...u,
  }));
}

function newMethod() {
  const sorted = [...allUsers]
    .sort((a, b) => (b.xp || 0) - (a.xp || 0))
    .slice(0, 25)
    .map((u, i) => ({
      rank: i + 1,
      username: u.username,
      xp: u.xp || 0,
      level: u.level || 1,
      coins: u.coins || 0,
      avatar: u.avatar,
    }));
  return sorted;
}

const startOld = performance.now();
for (let i = 0; i < 10; i++) oldMethod();
const endOld = performance.now();

const startNew = performance.now();
for (let i = 0; i < 10; i++) newMethod();
const endNew = performance.now();

console.log(`Old method (10 runs): ${(endOld - startOld).toFixed(2)}ms`);
console.log(`New method (10 runs): ${(endNew - startNew).toFixed(2)}ms`);
