import fs from 'node:fs';
import path from 'node:path';
import { XMLParser } from 'fast-xml-parser';
import * as cheerio from 'cheerio';
import * as yaml from 'js-yaml';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const xmlPath = path.join(rootDir, 'scripts/migration/export.xml');
const coursesDir = path.join(rootDir, 'src/content/courses');

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isWrite = args.includes('--write');
const slugArgIndex = args.indexOf('--slug');
const targetSlug = slugArgIndex !== -1 ? args[slugArgIndex + 1] : null;

if (!fs.existsSync(xmlPath)) {
  console.error(`XML file not found at ${xmlPath}`);
  process.exit(1);
}

const xmlData = fs.readFileSync(xmlPath, 'utf8');
const parser = new XMLParser({ ignoreAttributes: false, cdataPropName: '__cdata' });
const result = parser.parse(xmlData);

const items = result.rss?.channel?.item || [];
const itemsArr = Array.isArray(items) ? items : [items];

function getStringVal(val) {
  if (typeof val === 'object' && val !== null && val.__cdata) return val.__cdata;
  return String(val || '');
}

const courseFiles = fs.readdirSync(coursesDir).filter(f => f.endsWith('.md'));

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

let processedCount = 0;

for (const file of courseFiles) {
  const slug = file.replace('.md', '');
  if (targetSlug && slug !== targetSlug) continue;

  const item = itemsArr.find(i => getStringVal(i['wp:post_name']) === slug && getStringVal(i['wp:status']) === 'publish' && ['page', 'post', 'course'].includes(getStringVal(i['wp:post_type'])));
  if (!item) continue;

  let rawContent = getStringVal(item['content:encoded'] || '');
  rawContent = cleanHtml(rawContent);
  const $ = cheerio.load(rawContent);
  
  const extractedModules = [];
  const extractedFaqs = [];
  let extractedWhyLearnCopy = '';
  let extractedValueProp = '';
  let extractedOverview = '';

  const allElements = $('h1, h2, h3, h4, h5, h6, p, ul, ol, a, .elementor-accordion-item, .elementor-toggle-item, .elementskit-card, details').toArray();

  let state = 'normal'; 
  let currentModule = null;
  let currentFaq = null;
  let aboutParagraphs = [];
  let potentialAboutParagraphs = [];
  let overviewParagraphs = [];
  let isCheckingForValueProp = true;
  
  for (let i = 0; i < allElements.length; i++) {
    const el = allElements[i];
    const $el = $(el);
    const tagName = el.tagName.toLowerCase();
    const text = cleanText($el.text());
    
    if (tagName === 'p' && isCheckingForValueProp && text.length > 50 && state === 'normal') {
       if (!extractedValueProp) {
         extractedValueProp = text;
         isCheckingForValueProp = false;
       }
    }
    
    // State transitions on Headings
    if (/^h[1-6]$/.test(tagName)) {
      if (/(overview of|course overview)/i.test(text)) {
        state = 'overview';
        isCheckingForValueProp = false;
        continue;
      }
      if (state === 'overview' && /(register now|course content|📘\s*course curriculum|key features)/i.test(text)) {
        state = 'normal';
      }
      if (/(📘\s*course curriculum|course content)/i.test(text)) {
        state = 'modules';
        continue;
      }
      if (/(faq'?s\s+on|frequently\s+asked\s+questions)/i.test(text)) {
        state = 'faqs';
        continue;
      }
      if (state === 'faqs' && /(need\s+demo|let'?s\s+connect|enroll\s+now)/i.test(text)) {
        state = 'normal';
      }
      if (state === 'modules' && /(about\s+.*?course|about\s+|key features)/i.test(text)) {
        state = 'normal';
      }
      
      // Step 3: Why Learn extraction
      if (/^about\s+/i.test(text)) {
        state = 'about';
        potentialAboutParagraphs = []; // Reset on each About heading to get the last one before objectives
        continue;
      }
      if (/(course objectives of|objectives of)/i.test(text)) {
        if (state === 'about' || potentialAboutParagraphs.length > 0) {
          aboutParagraphs = [...potentialAboutParagraphs];
        }
        state = 'normal';
      }
      
      // Step 1: Module Extraction Pattern A (Heading)
      if (state === 'modules') {
        const modMatch = text.match(/(?:Module|Level)\s*\d+[:\-.]?\s*([^<\n]+)/i);
        if (modMatch) {
          currentModule = { title: text, duration: '', topics: [] };
          extractedModules.push(currentModule);
          continue;
        }
      }
    }
    
    if (tagName === 'a' && ($el.attr('data-ekit-toggle') === 'collapse' || $el.hasClass('elementor-accordion-title') || $el.hasClass('elementor-toggle-title'))) {
       if (state === 'modules') {
         const modMatch = text.match(/(?:Module|Level)\s*\d+[:\-.]?\s*([^<\n]+)/i);
         if (modMatch) {
            currentModule = { title: text, duration: '', topics: [] };
            extractedModules.push(currentModule);
         } else {
            // some don't have module prefix but are toggles in curriculum
            currentModule = { title: text, duration: '', topics: [] };
            extractedModules.push(currentModule);
         }
       } else if (state === 'faqs') {
         let q = text.replace(/^(?:Q\d*[:.]?\s*|\d+[\.)]\s*)/i, '').trim();
         if (q.length >= 10) {
            currentFaq = { question: q, answer: '' };
            extractedFaqs.push(currentFaq);
         }
       }
       continue;
    }
    
    // Step 1: Modules Extraction Logic
    if (state === 'modules') {
      if (tagName === 'ul' || tagName === 'ol') {
        let isFlatList = false;
        $el.find('li').each((_, li) => {
          const liText = cleanText($(li).text());
          if (!liText) return;
          // Pattern B: Flat List Structure
          if (/(?:Module|Level)\s*\d+[:\-.]?/i.test(liText)) {
            isFlatList = true;
            currentModule = { title: liText, duration: '', topics: [] };
            extractedModules.push(currentModule);
          } else if (currentModule) {
            currentModule.topics.push(liText);
          } else if (!isFlatList && extractedModules.length > 0) {
             extractedModules[extractedModules.length - 1].topics.push(liText);
          }
        });
      } else if (tagName === 'p') {
        const modMatch = text.match(/(?:Module|Level)\s*\d+[:\-.]?\s*([^<\n]+)/i);
        if (modMatch) {
          currentModule = { title: text, duration: '', topics: [] };
          extractedModules.push(currentModule);
        } else if (currentModule && text.length > 0 && text.length < 150) {
          currentModule.topics.push(text);
        }
      } else if (['div', 'details'].includes(tagName)) {
        let tTitle = cleanText($el.find('.elementor-tab-title, .elementor-toggle-title, a[data-ekit-toggle="collapse"], .elementskit-card-header, summary').text());
        if (!tTitle && tagName === 'details') tTitle = cleanText($el.find('summary').text());
        
        let tContent = cleanText($el.find('.elementor-tab-content, .elementor-toggle-content, .elementskit-card-body, p, ul').text());
        
        if (/(module\s*\d+:?|level\s*\d+:?)/i.test(tTitle)) {
          currentModule = { title: tTitle, duration: '', topics: [] };
          extractedModules.push(currentModule);
          tContent.split(/\n|•|-/).forEach(t => {
            const ct = t.trim();
            if (ct) currentModule.topics.push(ct);
          });
        }
      }
    }
    
    // Step 2: FAQs Extraction Logic
    if (state === 'faqs') {
      if (['div', 'details'].includes(tagName)) {
         // Check for accordion items
         let q = cleanText($el.find('.elementor-tab-title, .elementor-toggle-title, a[data-ekit-toggle="collapse"], .elementskit-card-header, summary').text());
         if (!q && tagName === 'details') q = cleanText($el.find('summary').text());
         
         let a = cleanText($el.find('.elementor-tab-content, .elementor-toggle-content, .elementskit-card-body, p').text());
         
         if (q && a) {
           q = q.replace(/^(?:Q\d*[:.]?\s*|\d+[\.)]\s*)/i, '').trim();
           a = a.replace(/^(?:A\d*[:.]?\s*|Ans[:.]?\s*|[-–—:]\s*)/i, '').trim();
           if (q.length >= 10 && a.length >= 20) {
             extractedFaqs.push({ question: q, answer: a });
           }
         }
      } else if (tagName === 'p') {
         if (currentFaq && !currentFaq.answer) {
             let a = text.replace(/^(?:A\d*[:.]?\s*|Ans[:.]?\s*|[-–—:]\s*)/i, '').trim();
             if (a.length >= 20) {
                 currentFaq.answer = a;
                 currentFaq = null; 
             }
             continue;
         }
         
         // Check for paragraph-based FAQ
         const htmlContent = $el.html() || '';
         let q = '';
         let a = '';
         
         // Primary Check: <strong> or <b>
         const strongMatch = htmlContent.match(/^(?:<(?:strong|b)[^>]*>)(.*?)(?:<\/(?:strong|b)>)(.*)/is);
         if (strongMatch) {
            q = cleanText(cheerio.load(strongMatch[1]).text());
            a = cleanText(cheerio.load(strongMatch[2]).text());
         } else {
            // Secondary Check: First ? within 160 chars
            const qmIndex = text.indexOf('?');
            if (qmIndex !== -1 && qmIndex < 160) {
               q = text.substring(0, qmIndex + 1).trim();
               a = text.substring(qmIndex + 1).trim();
            }
         }
         
         if (q && a) {
           q = q.replace(/^(?:Q\d*[:.]?\s*|\d+[\.)]\s*)/i, '').trim();
           a = a.replace(/^(?:A\d*[:.]?\s*|Ans[:.]?\s*|[-–—:]\s*)/i, '').trim();
           if (q.length >= 10 && a.length >= 20) {
             extractedFaqs.push({ question: q, answer: a });
           }
         }
      }
    }
    
    // Step 3: Why Learn / About Extraction Logic
    if (state === 'about' && tagName === 'p') {
       if (text.length > 50) { // filter short marketing snippets
          potentialAboutParagraphs.push(text);
       }
    }
    
    // Step 4: Overview Extraction Logic
    if (state === 'overview' && tagName === 'p' && text.length > 30) {
      overviewParagraphs.push(text);
    }
  }
  
  if (potentialAboutParagraphs.length > 0 && aboutParagraphs.length === 0) {
     aboutParagraphs = [...potentialAboutParagraphs];
  }
  
  extractedModules.forEach(m => {
    m.duration = `${m.topics.length} topics`;
  });
  
  extractedWhyLearnCopy = aboutParagraphs.join('\n\n');
  extractedOverview = overviewParagraphs.join('\n\n');
  
  if (!extractedValueProp && overviewParagraphs.length > 0) {
     extractedValueProp = overviewParagraphs[0];
  }
  
  if (isDryRun && targetSlug === slug) {
    console.log(`\n--- Dry Run Output for ${slug} ---`);
    console.log("Modules:");
    console.log(yaml.dump(extractedModules));
    console.log("FAQs:");
    console.log(yaml.dump(extractedFaqs));
    console.log("Why Learn:");
    console.log(extractedWhyLearnCopy);
    console.log('\nOverview:');
    console.log(extractedOverview);
    console.log('\nValue Prop:');
    console.log(extractedValueProp);
    process.exit(0);
  }
  
  if (isWrite) {
    const mdPath = path.join(coursesDir, file);
    const mdContent = fs.readFileSync(mdPath, 'utf8');
    const frontmatterMatch = mdContent.match(/^---\n([\s\S]*?)\n---/);
    if (frontmatterMatch) {
      try {
        const existingFrontmatter = yaml.load(frontmatterMatch[1]);
        
        // Update ONLY modules, faqs, and whyMaster.description
        if (extractedModules.length > 0) {
          existingFrontmatter.modules = extractedModules;
          delete existingFrontmatter.syllabus; // Remove stale mock syllabus
        }
        if (extractedFaqs.length > 0) {
          existingFrontmatter.faqs = extractedFaqs;
        }
        if (extractedWhyLearnCopy) {
          existingFrontmatter.whyMaster = {
             ...(existingFrontmatter.whyMaster || {}),
             description: extractedWhyLearnCopy
          };
        }
        if (extractedOverview) {
          existingFrontmatter.overview = extractedOverview;
        }
        if (extractedValueProp) {
          existingFrontmatter.valueProp = extractedValueProp;
        }
        
        const newFrontmatterStr = yaml.dump(existingFrontmatter, { lineWidth: -1 });
        const newFileContent = mdContent.replace(/^---\n[\s\S]*?\n---/, `---\n${newFrontmatterStr}---`);
        fs.writeFileSync(mdPath, newFileContent);
        processedCount++;
      } catch (e) {
        console.error(`Error parsing YAML for ${slug}: ${e.message}`);
      }
    }
  }
}

if (isWrite) {
  console.log(`Successfully migrated ${processedCount} courses.`);
}
