import fs from 'fs';
import path from 'path';
import { XMLParser } from 'fast-xml-parser';
import * as cheerio from 'cheerio';
import * as yaml from 'js-yaml';
import TurndownService from 'turndown';
import turndownPluginGfm from 'turndown-plugin-gfm';

const { gfm } = turndownPluginGfm;

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isWrite = args.includes('--write');

if (!isDryRun && !isWrite) {
  console.log("Please specify --dry-run or --write");
  process.exit(1);
}

const inputPath = path.resolve('scripts/migration/export.xml');
const outputDir = path.resolve('src/content/blog');

if (!fs.existsSync(inputPath)) {
  console.error(`File not found: ${inputPath}`);
  process.exit(1);
}

const xmlData = fs.readFileSync(inputPath, 'utf8');

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  cdataPropName: "__cdata"
});

const parsed = parser.parse(xmlData);

const items = parsed?.rss?.channel?.item;
if (!items) {
  console.error("No items found in XML.");
  process.exit(1);
}

const postsArray = Array.isArray(items) ? items : [items];

// Normalize string (extract CDATA if needed)
const extractText = (val) => {
  if (typeof val === 'object' && val !== null && val.__cdata) {
    return val.__cdata;
  }
  return typeof val === 'string' ? val : '';
};

// 1. Post Filtering Rules
const blogPosts = postsArray.filter(item => {
  const postType = extractText(item['wp:post_type']);
  const status = extractText(item['wp:status']);
  return postType === 'post' && status === 'publish';
});

console.log(`Found ${blogPosts.length} published blog posts.`);

const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced'
});
turndownService.use(gfm);

// Rule to strip CMS comments and builder shortcodes
const stripShortcodesAndComments = (html) => {
  let clean = html;
  // strip wp comments
  clean = clean.replace(/<!--\s*\/?wp:[^>]+-->/g, '');
  // strip builder shortcodes [vc_row] [/vc_row] etc
  clean = clean.replace(/\[\/?(vc_[^\]]+|elementor[^\]]+|ekit[^\]]+)\]/gi, '');
  return clean;
};

const resolveThumbnailUrl = (postId, itemsList) => {
  const post = itemsList.find(i => i['wp:post_id'] == postId);
  if (!post) return '';
  const postMeta = Array.isArray(post['wp:postmeta']) ? post['wp:postmeta'] : [post['wp:postmeta']].filter(Boolean);
  const thumbnailMeta = postMeta.find(meta => meta['wp:meta_key'] === '_thumbnail_id');
  
  if (thumbnailMeta) {
    const thumbId = extractText(thumbnailMeta['wp:meta_value']);
    const attachment = itemsList.find(i => i['wp:post_id'] == thumbId && i['wp:post_type'] === 'attachment');
    if (attachment && attachment['wp:attachment_url']) {
      return extractText(attachment['wp:attachment_url']);
    }
  }
  return '';
};

for (const post of blogPosts) {
  const title = extractText(post.title).trim();
  let slug = extractText(post['wp:post_name']);
  if (!slug) {
    slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  let rawDate = extractText(post['wp:post_date']) || extractText(post.pubDate);
  let pubDate = rawDate ? new Date(rawDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

  let author = extractText(post['dc:creator']) || "Ask4Trainings Editorial Team";

  let tags = [];
  const categoryData = post.category;
  if (categoryData) {
    const catArray = Array.isArray(categoryData) ? categoryData : [categoryData];
    catArray.forEach(c => {
      let catText = extractText(c);
      if (typeof c === 'object' && c['#text']) catText = c['#text']; // fast-xml-parser might parse it this way
      catText = catText.toLowerCase().trim();
      if (catText && catText !== 'uncategorized') {
        tags.push(catText);
      }
    });
  }
  tags = [...new Set(tags)];

  let rawContent = extractText(post['content:encoded']);
  let rawExcerpt = extractText(post['excerpt:encoded']);

  let description = '';
  if (rawExcerpt) {
    const $ = cheerio.load(rawExcerpt);
    description = $.text().trim();
  } else {
    const $ = cheerio.load(rawContent);
    const firstP = $('p').first().text().trim();
    if (firstP) {
      description = firstP.substring(0, 155);
      if (firstP.length > 155) description += '...';
    } else {
      description = $.text().substring(0, 155).trim();
      if ($.text().length > 155) description += '...';
    }
  }
  description = description.replace(/\s+/g, ' ').trim() || "No description available.";

  let image = resolveThumbnailUrl(post['wp:post_id'], postsArray);

  // Body sanitization
  let cleanHtml = stripShortcodesAndComments(rawContent);
  const $ = cheerio.load(cleanHtml);
  
  // replace &nbsp;
  $('body').contents().each(function() {
    if (this.type === 'text') {
      this.data = this.data.replace(/\u00a0/g, ' ');
    }
  });

  // remove empty p
  $('p').each((i, el) => {
    if ($(el).text().trim() === '' && $(el).find('img, iframe').length === 0) {
      $(el).remove();
    }
  });

  const finalHtml = $('body').html() || '';
  const markdownBody = turndownService.turndown(finalHtml);

  const frontmatter = {
    title,
    description,
    pubDate: pubDate + 'T00:00:00.000Z',
    author,
    tags,
    draft: false
  };
  
  if (image) frontmatter.image = image;

  const yamlStr = yaml.dump(frontmatter);
  const fileContent = `---\n${yamlStr}---\n\n${markdownBody}\n`;

  if (isDryRun) {
    console.log(`\n--- DRY RUN: ${slug} ---`);
    console.log(yamlStr);
    break;
  }

  if (isWrite) {
    const outFilePath = path.join(outputDir, `${slug}.md`);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    fs.writeFileSync(outFilePath, fileContent, 'utf8');
    console.log(`Wrote ${slug}.md`);
  }
}
