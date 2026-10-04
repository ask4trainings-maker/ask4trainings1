export default function rehypeDownscaleH1() {
  return async (tree) => {
    const { visit } = await import('unist-util-visit');
    visit(tree, 'element', (node) => {
      if (node.tagName === 'h1') {
        node.tagName = 'h2';
      }
    });
  };
}
