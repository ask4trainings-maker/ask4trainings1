export default function rehypeExternalLinks() {
  return async (tree) => {
    const { visit } = await import('unist-util-visit');
    visit(tree, 'element', (node) => {
      if (node.tagName === 'a' && node.properties && node.properties.href) {
        const href = String(node.properties.href);
        if (href.startsWith('http') || href.startsWith('//')) {
          node.properties.target = '_blank';
          node.properties.rel = ['noopener', 'noreferrer'];
        }
      }
    });
  };
}
