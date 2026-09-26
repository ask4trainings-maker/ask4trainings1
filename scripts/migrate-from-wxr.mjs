import fs from 'node:fs';
import path from 'node:path';
import { XMLParser } from 'fast-xml-parser';
import * as cheerio from 'cheerio';
import matter from 'gray-matter';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const isWrite = process.argv.includes('--write');
const xmlPath = path.join(rootDir, 'scripts/migration/export.xml');
const coursesDir = path.join(rootDir, 'src/content/courses');

if (!fs.existsSync(xmlPath)) {
  console.error(`XML file not found at ${xmlPath}`);
  process.exit(1);
}

// 1. Get canonical slugs
const courseFiles = fs.readdirSync(coursesDir).filter(f => f.endsWith('.md'));
const canonicalSlugs = new Set();
const fileMap = new Map(); // slug -> filePath

courseFiles.forEach(file => {
  const filePath = path.join(coursesDir, file);
  const slug = file.replace('.md', '');
  canonicalSlugs.add(slug);
  fileMap.set(slug, filePath);
});

console.log(`Found ${canonicalSlugs.size} canonical courses in src/content/courses/`);

// 2. Parse XML
console.log(`Parsing XML from ${xmlPath}...`);
const xmlData = fs.readFileSync(xmlPath, 'utf8');
const parser = new XMLParser({
  ignoreAttributes: false,
  cdataPropName: '__cdata'
});
const result = parser.parse(xmlData);

const items = result.rss?.channel?.item;
if (!items) {
  console.error("No <item> elements found in XML");
  process.exit(1);
}

const itemsArr = Array.isArray(items) ? items : [items];
console.log(`Found ${itemsArr.length} items in XML`);

function getStringVal(val) {
  if (typeof val === 'object' && val !== null && val.__cdata) return val.__cdata;
  return String(val || '');
}

const validPostTypes = ['page', 'post', 'course'];

const filteredItems = itemsArr.filter(item => {
  const postType = getStringVal(item['wp:post_type']);
  const status = getStringVal(item['wp:status']);
  const slug = getStringVal(item['wp:post_name']);
  return validPostTypes.includes(postType) && status === 'publish' && canonicalSlugs.has(slug);
});

console.log(`Filtered down to ${filteredItems.length} matching published items.`);

function extractText($, element) {
  return $(element).text().trim().replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ');
}

function cleanHtml(html) {
  if (!html) return '';
  // basic cleanup of common wordpress garbage if passed raw
  let cleaned = html.replace(/\[\/?vc_[^\]]+\]/g, ''); // remove vc_ shortcodes
  cleaned = cleaned.replace(/\[\/?elementor[^\]]+\]/g, ''); // remove elementor shortcodes
  cleaned = cleaned.replace(/<!--\s*wp:[^-]+-->/g, ''); // remove gutenberg comments
  cleaned = cleaned.replace(/<!--\s*\/wp:[^-]+-->/g, ''); 
  cleaned = cleaned.replace(/&nbsp;/g, ' ');
  return cleaned;
}

const summary = [];

// 3. Process each matched item
for (const item of filteredItems) {
  const slug = getStringVal(item['wp:post_name']);
  const filePath = fileMap.get(slug);
  
  let rawContent = item['content:encoded'] || '';
  if (typeof rawContent === 'object' && rawContent.__cdata) {
    rawContent = rawContent.__cdata;
  } else if (typeof rawContent !== 'string') {
    rawContent = String(rawContent);
  }
  
  rawContent = cleanHtml(rawContent);
  const $ = cheerio.load(rawContent);
  
  const extracted = {
    overview: '',
    modules: [],
    whyMaster: undefined,
    objectives: [],
    benefits: undefined,
    whoShouldEnroll: [],
    jobRoles: [],
    faqs: [],
    seo: {
      metaTitle: '',
      metaDescription: ''
    }
  };

  // ----- Fuzzy Extraction State Machine -----
  // Because Elementor deeply nests headings and lists in separate div trees, 
  // sibling selectors like .next() fail. We must traverse linearly.
  
  let currentSection = 'overview';
  
  // We'll iterate all meaningful tags in document order
  const elements = $('h1, h2, h3, h4, h5, h6, ul, ol, p, .elementskit-card, .elementor-accordion-item, .elementor-toggle-item');
  
  elements.each((i, el) => {
      const $el = $(el);
      const tag = el.tagName.toLowerCase();
      const text = extractText($, $el);
      if (!text && tag !== 'div') return; // divs like cards might not have direct text
      
      // Handle Accordions first, they are self-contained
      if ($el.hasClass('elementor-accordion-item') || $el.hasClass('elementor-toggle-item') || $el.hasClass('elementskit-card')) {
          const q = extractText($, $el.find('.elementor-tab-title, .elementor-toggle-title, a[data-ekit-toggle="collapse"], .elementskit-card-header'));
          const a = extractText($, $el.find('.elementor-tab-content, .elementor-toggle-content, .elementskit-card-body, p'));
          
          if (currentSection === 'faqs' && q && a) {
              extracted.faqs.push({ question: q, answer: a });
          } else if (currentSection === 'modules' && q && a) {
               // sometimes modules are in accordions where topics are the text
               const topics = a.split(/[\n•]+/).map(t => t.trim()).filter(t => t);
               extracted.modules.push({ title: q, topics: topics.map(t => ({ topic: t })) });
          }
          return;
      }

      // Check if this element is a heading that shifts our state
      if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag)) {
          const lower = text.toLowerCase();
          if (/(curriculum|syllabus|course content|modules)/.test(lower)) {
              currentSection = 'modules';
              return;
          } else if (/(why master|why learn|deep dive|about.+course)/.test(lower)) {
              currentSection = 'whyMaster';
              if (!extracted.whyMaster) extracted.whyMaster = { title: text, description: '', pillars: [] };
              return;
          } else if (/(objectives|what you will learn|learning goals)/.test(lower)) {
              currentSection = 'objectives';
              return;
          } else if (/(benefits|course highlights|key features)/.test(lower)) {
              currentSection = 'benefits';
              if (!extracted.benefits) extracted.benefits = { basicKnowledge: [], techSkills: [], careerInterests: [] };
              return;
          } else if (/(who should enroll|eligibility|target audience|who is this for)/.test(lower)) {
              currentSection = 'whoShouldEnroll';
              return;
          } else if (/(job roles|career opportunities|career scope)/.test(lower)) {
              currentSection = 'jobRoles';
              return;
          } else if (/(faq|frequently asked|questions)/.test(lower)) {
              currentSection = 'faqs';
              return;
          } else if (currentSection === 'modules') {
              extracted.modules.push({ title: text, topics: [] });
              return;
          } else if (currentSection === 'whoShouldEnroll') {
              extracted.whoShouldEnroll.push({ title: text, description: '' });
              return;
          } else if (currentSection === 'jobRoles') {
              extracted.jobRoles.push({ role: text, description: '' });
              return;
          } else if (currentSection === 'faqs') {
              extracted.faqs.push({ question: text, answer: '' });
              return;
          }
      }
      
      // Process content based on current state
      if (tag === 'p') {
          if (currentSection === 'overview' && !extracted.overview) {
              extracted.overview = text;
          } else if (currentSection === 'whyMaster' && extracted.whyMaster && !extracted.whyMaster.description) {
              extracted.whyMaster.description = text;
          } else if (currentSection === 'whoShouldEnroll' && extracted.whoShouldEnroll.length > 0) {
              extracted.whoShouldEnroll[extracted.whoShouldEnroll.length - 1].description += (extracted.whoShouldEnroll[extracted.whoShouldEnroll.length - 1].description ? ' ' : '') + text;
          } else if (currentSection === 'jobRoles' && extracted.jobRoles.length > 0) {
              extracted.jobRoles[extracted.jobRoles.length - 1].description += (extracted.jobRoles[extracted.jobRoles.length - 1].description ? ' ' : '') + text;
          } else if (currentSection === 'faqs' && extracted.faqs.length > 0) {
              extracted.faqs[extracted.faqs.length - 1].answer += (extracted.faqs[extracted.faqs.length - 1].answer ? ' ' : '') + text;
          }
      } else if (tag === 'ul' || tag === 'ol') {
          const items = [];
          $el.find('li').each((_, li) => {
              const liText = extractText($, li);
              if (liText) items.push(liText);
          });
          
          if (currentSection === 'modules') {
              if (extracted.modules.length > 0) {
                  const lastMod = extracted.modules[extracted.modules.length - 1];
                  lastMod.topics.push(...items.map(t => ({ topic: t })));
              } else {
                  extracted.modules.push({ title: "Curriculum", topics: items.map(t => ({ topic: t })) });
              }
          } else if (currentSection === 'objectives') {
              extracted.objectives.push(...items.map(t => ({ item: t })));
          } else if (currentSection === 'benefits') {
              if (extracted.benefits) {
                  extracted.benefits.techSkills.push(...items.map(t => ({ item: t })));
              }
          } else if (currentSection === 'whoShouldEnroll') {
              if (extracted.whoShouldEnroll.length > 0) {
                   // if we already have a profile from a heading, add these as bullets to description? 
                   // or maybe these are the profiles. Let's add them as profiles if there's no active profile description being built.
                   extracted.whoShouldEnroll.push(...items.map(t => ({ title: t, description: 'Eligible for this course.' })));
              } else {
                   extracted.whoShouldEnroll.push(...items.map(t => ({ title: t, description: 'Eligible for this course.' })));
              }
          } else if (currentSection === 'jobRoles') {
              extracted.jobRoles.push(...items.map(t => ({ role: t, description: 'Explore opportunities in this role.' })));
          }
      }
  });

  // ----- SEO Metadata -----
  let metaTitle = '';
  let metaDesc = '';
  const postMeta = item['wp:postmeta'];
  if (postMeta) {
      const metas = Array.isArray(postMeta) ? postMeta : [postMeta];
      metas.forEach(meta => {
          if (meta['wp:meta_key'] === 'rank_math_title' || meta['wp:meta_key'] === '_yoast_wpseo_title') {
              metaTitle = typeof meta['wp:meta_value'] === 'string' ? meta['wp:meta_value'] : meta['wp:meta_value']?.__cdata || '';
          }
          if (meta['wp:meta_key'] === 'rank_math_description' || meta['wp:meta_key'] === '_yoast_wpseo_metadesc') {
              metaDesc = typeof meta['wp:meta_value'] === 'string' ? meta['wp:meta_value'] : meta['wp:meta_value']?.__cdata || '';
          }
      });
  }
  
  if (!metaTitle) metaTitle = `${item.title} | Ask 4 Trainings`;
  if (!metaDesc && extracted.overview) {
      metaDesc = extracted.overview.substring(0, 155) + (extracted.overview.length > 155 ? '...' : '');
  }
  extracted.seo.metaTitle = metaTitle;
  extracted.seo.metaDescription = metaDesc;

  // Clean empty arrays/objects to not pollute frontmatter with empty defaults unnecessarily
  if (!extracted.overview) delete extracted.overview;
  if (!extracted.modules.length) delete extracted.modules;
  if (!extracted.objectives.length) delete extracted.objectives;
  if (!extracted.whoShouldEnroll.length) delete extracted.whoShouldEnroll;
  if (!extracted.jobRoles.length) delete extracted.jobRoles;
  if (!extracted.faqs.length) delete extracted.faqs;
  if (!extracted.benefits?.techSkills?.length && !extracted.benefits?.basicKnowledge?.length && !extracted.benefits?.careerInterests?.length) {
      delete extracted.benefits;
  }
  if (!extracted.whyMaster?.title) delete extracted.whyMaster;
  if (!extracted.seo.metaTitle && !extracted.seo.metaDescription) delete extracted.seo;


  // Track missing sections for summary
  const missing = [];
  if (!extracted.modules) missing.push('modules');
  if (!extracted.whyMaster) missing.push('whyMaster');
  if (!extracted.objectives) missing.push('objectives');
  if (!extracted.benefits) missing.push('benefits');
  if (!extracted.whoShouldEnroll) missing.push('whoShouldEnroll');
  if (!extracted.jobRoles) missing.push('jobRoles');
  if (!extracted.faqs) missing.push('faqs');

  summary.push({
    slug,
    modules: extracted.modules ? extracted.modules.length : 0,
    faqs: extracted.faqs ? extracted.faqs.length : 0,
    eligibility: extracted.whoShouldEnroll ? extracted.whoShouldEnroll.length : 0,
    missing: missing.join(', ')
  });

  if (isWrite) {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const parsed = matter(fileContent);
    
    // Merge data, prioritizing extracted content but preserving manual overrides (like category)
    // Actually, usually we prioritize manual fields, but for this migration let's merge carefully:
    const newData = { ...parsed.data };
    
    if (extracted.overview) newData.overview = extracted.overview;
    if (extracted.modules) newData.modules = extracted.modules; // replace syllabus
    if (extracted.whyMaster) newData.whyMaster = extracted.whyMaster;
    if (extracted.objectives) newData.objectives = extracted.objectives;
    if (extracted.benefits) newData.benefits = extracted.benefits;
    if (extracted.whoShouldEnroll) newData.whoShouldEnroll = extracted.whoShouldEnroll;
    if (extracted.jobRoles) newData.jobRoles = extracted.jobRoles;
    if (extracted.faqs) newData.faqs = extracted.faqs;
    if (extracted.seo) newData.seo = { ...newData.seo, ...extracted.seo };
    
    // Optional: remove old syllabus to clean up
    delete newData.syllabus;
    delete newData.eligibility; // using whoShouldEnroll instead
    
    const updatedContent = matter.stringify(parsed.content || '', newData);
    fs.writeFileSync(filePath, updatedContent);
  }
}

console.log("\n--- Extraction Summary ---");
console.table(summary);

console.log(`\nMerge Mode: ${isWrite ? "WRITE" : "DRY RUN"}`);
if (!isWrite) {
    console.log("Run with --write to apply changes to markdown files.");
}
