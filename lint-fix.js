import fs from 'fs';

let content = fs.readFileSync('src/routes/data.js', 'utf8');
content = content.replace(/const newBookmark = await store.create/g, "await store.create");
fs.writeFileSync('src/routes/data.js', content);

content = fs.readFileSync('src/routes/notifications.js', 'utf8');
content = content.replace(/const sanitizedAction = sanitize\(/g, "sanitize(");
fs.writeFileSync('src/routes/notifications.js', content);
