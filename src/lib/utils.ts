export function proxyImageUrl(url?: string): string | undefined {
  if (!url) return undefined;
  if (url.includes('images.weserv.nl')) return url;
  const cleanUrl = url.replace(/^https?:\/\//, '');
  return `https://images.weserv.nl/?url=${encodeURIComponent(cleanUrl)}&w=150&h=150&fit=cover`;
}
