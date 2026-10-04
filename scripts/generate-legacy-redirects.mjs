import fs from 'fs';
import path from 'path';
import { XMLParser } from 'fast-xml-parser';

const WXR_PATH = path.join(process.cwd(), 'scripts', 'migration', 'export.xml');
const REDIRECTS_PATH = path.join(process.cwd(), 'public', '_redirects');

async function generateRedirects() {
  if (!fs.existsSync(WXR_PATH)) {
    console.error(`WXR export file not found at ${WXR_PATH}`);
    process.exit(1);
  }

  const xmlContent = fs.readFileSync(WXR_PATH, 'utf-8');
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
    cdataPropName: '__cdata',
    parseTagValue: false
  });
  
  const result = parser.parse(xmlContent);
  const channel = result.rss?.channel;
  
  if (!channel) {
    console.error('Invalid WXR format: Missing RSS channel');
    process.exit(1);
  }

  const items = Array.isArray(channel.item) ? channel.item : [channel.item];
  const redirects = new Set();
  
  // Standard Legacy Rules
  redirects.add('/feed/ /blog/ 301');
  redirects.add('/feed/* /blog/ 301');
  redirects.add('/category/* /courses/ 301');
  redirects.add('/tag/* /blog/ 301');
  
  // Enforce canonical /blog/ routing and catch stale/plural misdirections
  redirects.add('/blogs/ /blog/ 301');
  redirects.add('/blogs/* /blog/:splat 301');
  redirects.add('/blog /blog/ 301');

  items.forEach(item => {
    if (!item) return;
    const status = item['wp:status'];
    const postType = item['wp:post_type'];
    if (status !== 'publish' || (postType !== 'post' && postType !== 'page')) return;

    let link = item.link || '';
    if (typeof link === 'string') {
      try {
        const url = new URL(link);
        let path = url.pathname;
        if (!path.endsWith('/')) path += '/';
        const postName = item['wp:post_name'];
        if (postName) {
          const newPath = postType === 'post' ? `/blog/${postName}/` : `/${postName}/`;
          if (path !== newPath && path !== '/' && newPath !== '/') {
            redirects.add(`${path} ${newPath} 301`);
          }
        }
      } catch (e) {
        // Invalid URL, ignore
      }
    }
  });

  const header = '# Auto-generated legacy WordPress 301 Redirects\n# Legacy Feeds & Archives\n';
  const content = header + Array.from(redirects).join('\n') + '\n';
  
  fs.writeFileSync(REDIRECTS_PATH, content);
  console.log(`Generated _redirects file at ${REDIRECTS_PATH} with ${redirects.size} rules.`);
}

generateRedirects().catch(console.error);
