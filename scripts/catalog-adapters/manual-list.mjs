import fs from 'node:fs/promises';

export async function loadSource({ file, source }) {
  const target = file || source.file;
  if (!target) return [];
  const raw = await fs.readFile(target, 'utf8');
  return raw
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'))
    .map((line) => {
      const [title, url, category, tags, description, thumbnail] = line.split('|').map(part => part?.trim() || '');
      return {
        title,
        url,
        category,
        tags: tags ? tags.split(',').map(tag => tag.trim()).filter(Boolean) : [],
        description,
        thumbnail,
      };
    });
}
