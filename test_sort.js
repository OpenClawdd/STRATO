const n = 100000;
const dates = Array.from({ length: n }, () => new Date(Date.now() - Math.random() * 10000000000).toISOString());
const datesCopy = [...dates];

console.time('new Date sort');
dates.sort((a, b) => new Date(b) - new Date(a));
console.timeEnd('new Date sort');

console.time('String sort');
datesCopy.sort((a, b) => {
    const aVal = a || '';
    const bVal = b || '';
    return aVal < bVal ? 1 : (aVal > bVal ? -1 : 0);
});
console.timeEnd('String sort');

// ensure identical result
const isSame = dates.every((val, i) => val === datesCopy[i]);
console.log('Results are identical:', isSame);
