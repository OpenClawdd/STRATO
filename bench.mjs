import { getTopN } from "./src/utils/sort.js";

const largeArray = Array.from({ length: 100000 }, (_, i) => ({ id: i, xp: Math.random() * 10000 }));

console.time('sort + slice');
const sorted = largeArray
  .map(u => ({ ...u, mapped: true }))
  .sort((a, b) => b.xp - a.xp)
  .slice(0, 25);
console.timeEnd('sort + slice');

console.time('getTopN');
const top25 = getTopN(largeArray, 25, u => u.xp)
  .map(u => ({ ...u, mapped: true }));
console.timeEnd('getTopN');
