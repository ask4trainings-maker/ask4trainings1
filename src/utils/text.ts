export function decodeHtmlEntities(text: string): string {
  if (!text) return '';
  return String(text)
    .replace(/&amp;/g, '&')
    .replace(/&#038;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#8217;/g, "'")
    .replace(/&#8216;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

export function resolveExcerpt(description: any, body: string): string {
  let excerpt = '';
  if (typeof description === 'string') {
    excerpt = description;
  } else if (typeof description === 'object' && description !== null) {
    excerpt = description.text || description.value || '';
  }
  
  if (!excerpt || excerpt === '[object Object]') {
    // Fallback: extract first 150 chars from body markdown
    if (body) {
      // Very basic stripping of markdown tokens like #, *, [], ()
      let cleanBody = body
        .replace(/#+\s+/g, '')
        .replace(/\*\*|__/g, '')
        .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
        .replace(/\n+/g, ' ')
        .trim();
      excerpt = cleanBody.substring(0, 150) + (cleanBody.length > 150 ? '...' : '');
    }
  }
  
  return decodeHtmlEntities(excerpt);
}
