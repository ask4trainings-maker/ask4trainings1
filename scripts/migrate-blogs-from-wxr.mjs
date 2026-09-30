import fs from 'fs';
import path from 'path';
import { XMLParser } from 'fast-xml-parser';
import * as cheerio from 'cheerio';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';

const EXPORT_PATH = path.join(process.cwd(), 'scripts/migration/export.xml');
const BLOG_DIR = path.join(process.cwd(), 'src/content/blog');
const REPORTS_DIR = path.join(process.cwd(), 'reports');

const isDryRun = process.argv.includes('--dry-run');
const isWrite = process.argv.includes('--write');

if (!isDryRun && !isWrite) {
  console.log('Please specify --dry-run or --write');
  process.exit(1);
}

const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced'
});
turndownService.use(gfm);

// Custom rules to preserve double newlines around blocks if needed, but Turndown mostly does it.
// We can pre-process HTML to strip WP and shortcodes.
function cleanHtml(rawHtml) {
  if (!rawHtml) return '';
  let html = rawHtml;

  // Remove WP block comments
  html = html.replace(/<!--\s*\/?wp:[^>]+-->/g, '');

  // Remove shortcodes
  html = html.replace(/\[\/?vc_[^\]]+\]/g, '');
  html = html.replace(/\[\/?elementor[^\]]+\]/g, '');
  html = html.replace(/\[\/?ekit[^\]]+\]/g, '');

  // Clean nbsp
  html = html.replace(/&nbsp;/g, ' ');

  return html;
}

function kebabCase(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

async function run() {
  console.log(`Loading XML from ${EXPORT_PATH}...`);
  const xmlData = fs.readFileSync(EXPORT_PATH, 'utf-8');

  const parser = new XMLParser({
    ignoreAttributes: false,
    cdataPropName: '__cdata',
    parseTagValue: true,
  });

  const parsed = parser.parse(xmlData);
  const items = parsed.rss?.channel?.item || [];
  const itemsArr = Array.isArray(items) ? items : [items];

  // 1. Pre-index attachments
  const attachments = {};
  itemsArr.forEach(item => {
    if (item['wp:post_type'] === 'attachment') {
      const postId = item['wp:post_id'];
      const url = item['wp:attachment_url'];
      if (postId && url) {
        attachments[postId] = typeof url === 'object' && url.__cdata ? url.__cdata : url;
      }
    }
  });

  // 2. Filter posts
  const posts = itemsArr.filter(item => {
    return item['wp:post_type'] === 'post' && item['wp:status'] === 'publish';
  });

  console.log(`Found ${posts.length} published blog posts.`);

  const auditReport = [];

  for (const item of posts) {
    // Title
    let title = item.title;
    if (typeof title === 'object' && title.__cdata) title = title.__cdata;
    if (!title) title = 'Untitled Post';

    // Slug
    let slug = item['wp:post_name'];
    if (typeof slug === 'object' && slug.__cdata) slug = slug.__cdata;
    if (!slug) slug = kebabCase(title);

    // Date
    let pubDate = item['wp:post_date'] || item.pubDate;
    if (typeof pubDate === 'object' && pubDate.__cdata) pubDate = pubDate.__cdata;
    const dateObj = new Date(pubDate);
    const dateStr = !isNaN(dateObj.getTime()) ? dateObj.toISOString().split('T')[0] : '2023-01-01';

    // Author
    let author = item['dc:creator'];
    if (typeof author === 'object' && author.__cdata) author = author.__cdata;
    author = author || "Ask4Trainings Editorial Team";

    // Categories and Tags
    const catsAndTags = Array.isArray(item.category) ? item.category : (item.category ? [item.category] : []);
    const tags = [];
    catsAndTags.forEach(cat => {
      let catName = '';
      if (typeof cat === 'object') {
        catName = cat['#text'] || cat.__cdata || '';
      } else if (typeof cat === 'string') {
        catName = cat;
      }
      if (catName && catName.toLowerCase() !== 'uncategorized') {
        tags.push(catName);
      }
    });
    const uniqueTags = [...new Set(tags)];

    // Thumbnail
    let featuredImage = '';
    const meta = Array.isArray(item['wp:postmeta']) ? item['wp:postmeta'] : (item['wp:postmeta'] ? [item['wp:postmeta']] : []);
    const thumbMeta = meta.find(m => m['wp:meta_key'] === '_thumbnail_id');
    if (thumbMeta) {
      let thumbId = thumbMeta['wp:meta_value'];
      if (typeof thumbId === 'object' && thumbId.__cdata) thumbId = thumbId.__cdata;
      if (attachments[thumbId]) {
        featuredImage = attachments[thumbId];
      }
    }

    // Body
    let bodyRaw = item['content:encoded'];
    if (typeof bodyRaw === 'object' && bodyRaw.__cdata) bodyRaw = bodyRaw.__cdata;
    
    let excerptRaw = item['excerpt:encoded'];
    if (typeof excerptRaw === 'object' && excerptRaw.__cdata) excerptRaw = excerptRaw.__cdata;

    const cleanedHtml = cleanHtml(bodyRaw);
    
    // Extract headings for audit
    const $ = cheerio.load(cleanedHtml);
    const headings = [];
    $('h1, h2, h3, h4, h5, h6').each((i, el) => {
      headings.push({
        tag: el.tagName.toLowerCase(),
        text: $(el).text().trim()
      });
    });

    const bodyMarkdown = turndownService.turndown(cleanedHtml).replace(/\n{3,}/g, '\n\n');
    
    let excerpt = excerptRaw ? turndownService.turndown(cleanHtml(excerptRaw)) : '';
    if (!excerpt) {
      const firstPara = $('p').first().text().trim();
      excerpt = firstPara.length > 160 ? firstPara.substring(0, 157) + '...' : firstPara;
    }
    excerpt = excerpt.replace(/\n/g, ' ').replace(/"/g, '\\"');
    
    const wordCount = bodyMarkdown.split(/\s+/).filter(w => w.length > 0).length;

    auditReport.push({
      title,
      slug,
      pubDate: dateStr,
      author,
      tags: uniqueTags,
      featuredImage: featuredImage || null,
      wordCount,
      headings,
      first200Chars: $('p').first().text().substring(0, 200)
    });

    if (isWrite) {
      let frontmatter = `---
title: "${title.replace(/"/g, '\\"')}"
description: "${excerpt}"
pubDate: ${dateStr}
author: "${author.replace(/"/g, '\\"')}"
tags: ${JSON.stringify(uniqueTags)}
draft: false
`;
      if (featuredImage) {
        frontmatter += `image: "${featuredImage}"\n`;
      }
      frontmatter += `---\n\n`;
      frontmatter += bodyMarkdown + '\n';

      fs.writeFileSync(path.join(BLOG_DIR, `${slug}.md`), frontmatter);
    }
  }

  // Write Reports
  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
  }

  fs.writeFileSync(path.join(REPORTS_DIR, 'blog-content-audit.json'), JSON.stringify(auditReport, null, 2));

  let mdReport = `# Blog Content Audit Report\n\n`;
  mdReport += `Total Articles Found: **${auditReport.length}**\n\n`;
  
  mdReport += `| Title | Slug | Date | Author | Tags | Words | Headings | Image |\n`;
  mdReport += `| --- | --- | --- | --- | --- | --- | --- | --- |\n`;
  
  for (const post of auditReport) {
    mdReport += `| ${post.title} | ${post.slug} | ${post.pubDate} | ${post.author} | ${post.tags.length} | ${post.wordCount} | ${post.headings.length} | ${post.featuredImage ? '✅' : '❌'} |\n`;
  }

  fs.writeFileSync(path.join(REPORTS_DIR, 'blog-content-audit.md'), mdReport);
  console.log('Audit reports generated in reports/ directory.');

}

run().catch(console.error);
