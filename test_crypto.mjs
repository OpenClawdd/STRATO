import crypto from 'crypto';
const secret = 'mysecret';
const provided = 'mysecret';

const buf1 = Buffer.from(secret);
const buf2 = Buffer.from(provided);
console.log(buf1.length === buf2.length && crypto.timingSafeEqual(buf1, buf2));

const wrong = 'wrong';
const buf3 = Buffer.from(wrong);
console.log(buf1.length === buf3.length); // false
