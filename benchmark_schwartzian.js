export function hash(value) {
  let output = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    output ^= value.charCodeAt(i);
    output = Math.imul(output, 16777619);
  }
  return output >>> 0;
}

const pool = Array.from({ length: 5000 }, (_, i) => ({ id: `game-${i}`, name: `Game ${i}` }));
const key = "2024-2-1";

// 1. Current approach
let start = performance.now();
for (let i = 0; i < 50; i++) {
  [...pool].sort((a, b) => hash(`${key}:${a.id}`) - hash(`${key}:${b.id}`));
}
let end = performance.now();
console.log(`Current: ${(end - start).toFixed(2)}ms`);

// 2. Schwartzian Transform
start = performance.now();
for (let i = 0; i < 50; i++) {
  [...pool]
    .map(a => ({ item: a, key: hash(`${key}:${a.id}`) }))
    .sort((a, b) => a.key - b.key)
    .map(a => a.item);
}
end = performance.now();
console.log(`Schwartzian: ${(end - start).toFixed(2)}ms`);
