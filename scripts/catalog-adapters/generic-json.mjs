function readPath(value, dottedPath) {
  if (!dottedPath) return value;
  return dottedPath.split('.').reduce((current, key) => current?.[key], value);
}

export async function loadSource({ source, fetchCached }) {
  if (!source.url) return [];
  const response = await fetchCached(source.url);
  const data = JSON.parse(response);
  const items = readPath(data, source.itemsPath) || data;
  if (!Array.isArray(items)) throw new Error('JSON source did not resolve to an array');
  const map = source.map || {};
  return items.map(item => ({
    title: readPath(item, map.title || 'title') || readPath(item, 'name'),
    url: readPath(item, map.url || 'url') || readPath(item, 'href'),
    category: readPath(item, map.category || 'category'),
    tags: readPath(item, map.tags || 'tags'),
    description: readPath(item, map.description || 'description'),
    thumbnail: readPath(item, map.thumbnail || 'thumbnail'),
    licenseNote: readPath(item, map.licenseNote || 'license'),
  }));
}
