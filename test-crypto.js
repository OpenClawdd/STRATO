import crypto from 'crypto';

const a = Buffer.from("test");
const b = Buffer.from("test");
console.log(crypto.timingSafeEqual(a, b));
