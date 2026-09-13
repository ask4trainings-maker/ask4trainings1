/**
 * Centralized URL Formatter Utility
 * Takes any slug, file path, or relative route and returns a strictly normalized path 
 * formatted as `/${slug}/` with a trailing slash.
 * Ignores external protocols, anchors, mailto:, and static assets.
 */
export function formatUrl(path: string): string {
  if (!path) return '/';

  // Ignore external links, mailto, tel, and anchor links
  if (
    path.startsWith('http://') ||
    path.startsWith('https://') ||
    path.startsWith('mailto:') ||
    path.startsWith('tel:') ||
    path.startsWith('#')
  ) {
    return path;
  }

  // Ignore static assets (basic check for file extensions)
  const assetRegex = /\.(png|jpg|jpeg|gif|svg|webp|ico|css|js|json|xml|pdf|txt|xml|webmanifest)$/i;
  if (assetRegex.test(path)) {
    return path;
  }

  // Strip leading/trailing slashes and specific content extensions
  let normalized = path
    .replace(/^\/+|\/+$/g, '')          // Remove leading and trailing slashes
    .replace(/\.(md|mdx|html)$/i, '');  // Remove content extensions

  // If empty after stripping, it was the root
  if (!normalized) return '/';

  // Return strictly formatted path with leading and trailing slash
  return `/${normalized}/`;
}
