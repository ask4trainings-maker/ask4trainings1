import fs from 'node:fs';
import path from 'node:path';
import { XMLParser } from 'fast-xml-parser';
import * as cheerio from 'cheerio';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const xmlPath = path.join(rootDir, 'scripts/migration/export.xml');
const coursesDir = path.join(rootDir, 'src/content/courses');
const reportsDir = path.join(rootDir, 'reports');

if (!fs.existsSync(xmlPath)) {
  console.error(`XML file not found at ${xmlPath}`);
  process.exit(1);
}

if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir, { recursive: true });
}

// Canonical matching
const courseFiles = fs.readdirSync(coursesDir).filter(f => f.endsWith('.md'));
const canonicalSlugs = new Set();
courseFiles.forEach(file => canonicalSlugs.add(file.replace('.md', '')));

// XML Parsing
const xmlData = fs.readFileSync(xmlPath, 'utf8');
const parser = new XMLParser({
  ignoreAttributes: false,
  cdataPropName: '__cdata'
});
const result = parser.parse(xmlData);

const items = result.rss?.channel?.item || [];
const itemsArr = Array.isArray(items) ? items : [items];

function getStringVal(val) {
  if (typeof val === 'object' && val !== null && val.__cdata) return val.__cdata;
  return String(val || '');
}

const auditData = [];
let matchedCount = 0;
const validPostTypes = ['page', 'post', 'course'];

const filteredItems = itemsArr.filter(item => {
  const postType = getStringVal(item['wp:post_type']);
  const status = getStringVal(item['wp:status']);
  const slug = getStringVal(item['wp:post_name']);
  return validPostTypes.includes(postType) && status === 'publish' && canonicalSlugs.has(slug);
});

function cleanText(text) {
  return text.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function cleanHtml(html) {
  if (!html) return '';
  let cleaned = html.replace(/\[\/?vc_[^\]]+\]/g, '');
  cleaned = cleaned.replace(/\[\/?elementor[^\]]+\]/g, '');
  cleaned = cleaned.replace(/<!--\s*wp:[^-]+-->/g, '');
  cleaned = cleaned.replace(/<!--\s*\/wp:[^-]+-->/g, ''); 
  cleaned = cleaned.replace(/&nbsp;/g, ' ');
  return cleaned;
}

for (const item of filteredItems) {
  matchedCount++;
  const slug = getStringVal(item['wp:post_name']);
  const title = getStringVal(item.title);
  
  let rawContent = item['content:encoded'] || '';
  rawContent = getStringVal(rawContent);
  rawContent = cleanHtml(rawContent);
  
  const $ = cheerio.load(rawContent);
  
  const headings = [];
  const toggles = [];
  
  // Find all headings
  $('h1, h2, h3, h4').each((i, el) => {
      const $el = $(el);
      const tag = el.tagName.toUpperCase();
      const text = cleanText($el.text());
      if (!text) return;
      
      // Attempt to gather sibling/child content counts
      let nestedCount = 0;
      let nestedType = '';
      let preview = '';
      
      // Look at siblings until the next heading of same or higher level
      let current = $el.next();
      let collectedText = '';
      
      while (current.length && !/^H[1-4]$/.test(current[0].tagName.toUpperCase())) {
          const t = current[0].tagName.toLowerCase();
          
          if (t === 'p') {
              nestedCount++;
              nestedType = 'paragraphs';
              collectedText += cleanText(current.text()) + ' ';
          } else if (t === 'ul' || t === 'ol') {
              const liCount = current.find('li').length;
              nestedCount += liCount;
              nestedType = 'list items';
              current.find('li').each((_, li) => {
                  collectedText += cleanText($(li).text()) + ' ';
              });
          } else if (t === 'div' && (current.hasClass('elementor-accordion-item') || current.hasClass('elementor-toggle-item') || current.hasClass('elementskit-card'))) {
              nestedCount++;
              nestedType = 'accordion items';
              collectedText += cleanText(current.text()) + ' ';
          } else {
              // Deep search inside arbitrary divs for lists or accordions
              const pCount = current.find('p').length;
              const liCount = current.find('li').length;
              const accCount = current.find('.elementor-accordion-item, .elementor-toggle-item, .elementskit-card').length;
              
              if (pCount > 0 && !nestedType) { nestedType = 'paragraphs'; nestedCount += pCount; }
              if (liCount > 0 && !nestedType) { nestedType = 'list items'; nestedCount += liCount; }
              if (accCount > 0 && !nestedType) { nestedType = 'accordion items'; nestedCount += accCount; }
              
              collectedText += cleanText(current.text()) + ' ';
          }
          current = current.next();
      }
      
      preview = collectedText.trim().substring(0, 100);
      if (collectedText.length > 100) preview += '...';
      
      headings.push({
          tag,
          text,
          nestedDetails: nestedCount > 0 ? `${nestedCount} ${nestedType}` : 'None',
          preview
      });
  });
  
  // Find all toggles / accordions
  $('.elementor-toggle-item, .elementor-tab-title, .elementskit-card, details').each((i, el) => {
      const $el = $(el);
      let tTitle = cleanText($el.find('.elementor-tab-title, .elementor-toggle-title, a[data-ekit-toggle="collapse"], .elementskit-card-header, summary').text());
      if (!tTitle && el.tagName.toLowerCase() === 'details') {
          tTitle = cleanText($el.find('summary').text());
      } else if (!tTitle) {
          tTitle = cleanText($el.text());
      }
      if (tTitle) toggles.push(tTitle);
  });
  
  // Bullet lists count
  const listCount = $('ul, ol').length;
  
  auditData.push({
      slug,
      title,
      headingsCount: headings.length,
      accordionsCount: toggles.length,
      listCount,
      headings,
      toggles
  });
}

// Generate JSON
fs.writeFileSync(path.join(reportsDir, 'wxr-content-audit.json'), JSON.stringify(auditData, null, 2));

// Generate Markdown
let md = `# WordPress XML Course Content Discovery Report\n\n`;

for (const course of auditData) {
    md += `## 1. Course: ${course.title} (\`${course.slug}\`)\n`;
    md += `- **Total Headings Detected:** ${course.headingsCount}\n`;
    md += `- **Accordion Elements Found:** ${course.accordionsCount}\n`;
    md += `- **Lists Found:** ${course.listCount}\n\n`;
    md += `### Detected Sections & Previews:\n`;
    md += `| Heading Text | Tag | Nested Elements | Content Preview |\n`;
    md += `|---|---|---|---|\n`;
    
    course.headings.forEach(h => {
        const hText = h.text.replace(/\|/g, '\\|');
        const nested = h.nestedDetails;
        const preview = h.preview.replace(/\|/g, '\\|').replace(/\n/g, ' ');
        md += `| "${hText}" | ${h.tag} | ${nested} | "${preview}" |\n`;
    });
    md += `\n`;
}

fs.writeFileSync(path.join(reportsDir, 'wxr-content-audit.md'), md);

// Console Output
console.log(`\n--- Discovery Complete ---`);
console.log(`Total canonical courses checked: ${canonicalSlugs.size}`);
console.log(`Courses found in XML: ${matchedCount}`);
console.log(`Missing in XML: ${canonicalSlugs.size - matchedCount}`);
const avgSections = matchedCount > 0 ? (auditData.reduce((acc, c) => acc + c.headingsCount, 0) / matchedCount).toFixed(1) : 0;
console.log(`Average number of sections detected per course: ${avgSections}`);
