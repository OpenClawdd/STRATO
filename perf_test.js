import { getTopN } from './src/utils/sort.js';

const largeArr = Array.from({ length: 100000 }, (_, i) => ({ id: i, score: Math.random() * 10000 }));

console.time('native sort');
const res1 = [...largeArr].sort((a, b) => b.score - a.score).slice(0, 10);
console.timeEnd('native sort');

console.time('getTopN');
const res2 = getTopN(largeArr, 10, x => x.score);
console.timeEnd('getTopN');
