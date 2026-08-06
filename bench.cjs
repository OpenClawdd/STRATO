const { performance } = require('perf_hooks');

const dates = Array.from({ length: 10000 }, (_, i) => ({
  created_at: new Date(Date.now() - Math.random() * 10000000000).toISOString()
}));

const start1 = performance.now();
const sorted1 = [...dates].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
const end1 = performance.now();

const start2 = performance.now();
const sorted2 = [...dates].sort((a, b) => {
  const aVal = a.created_at || '';
  const bVal = b.created_at || '';
  return aVal < bVal ? 1 : (aVal > bVal ? -1 : 0);
});
const end2 = performance.now();

console.log(`new Date: ${end1 - start1} ms`);
console.log(`string cmp: ${end2 - start2} ms`);
