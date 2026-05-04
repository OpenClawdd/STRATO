export async function loadSource({ source, fetchCached }) {
  if (!source.url) return [];
  const html = await fetchCached(source.url);
  const entries = [];
  const anchorRe = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = anchorRe.exec(html))) {
    const text = match[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (!text) continue;
    entries.push({
      title: text,
      url: new URL(match[1], source.url).href,
      category: source.defaultCategory || 'arcade',
      tags: source.defaultTags || [],
      description: '',
      thumbnail: '',
    });
  }
  return entries;
}
