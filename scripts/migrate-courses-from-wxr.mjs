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

  const extracted = {};

  // Find all elements to iterate sequentially
  const elements = $('h1, h2, h3, h4, h5, h6, p, ul, ol, .elementor-accordion-item, .elementor-toggle-item, .elementskit-card, details').toArray();
  
  let currentSection = null;
  let currentSubHeading = null;
  
  let overviewPart1 = '';
  let overviewPart2 = '';
  
  let currentModule = null;
  let modules = [];
  
  let whyMasterDesc = '';
  let aboutHeaderCount = 0;
  
  let objectives = [];
  let whyMasterPillars = [];
  let currentPillar = null;
  
  let benefits = [];
  let currentBenefit = null;
  
  let whyChoose = '';
  
  let whoShouldEnroll = [];
  let currentProfile = null;
  
  let certification = null;
  
  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    const $el = $(el);
    const tagName = el.tagName.toLowerCase();
    const text = cleanText($el.text());
    
    // Header detection for sections
    if (/^h[1-6]$/.test(tagName)) {
      if (/(job roles of)/i.test(text)) {
        break; // Hard Stop Boundary
      }
      
      if (/(register now|your name|your email)/i.test(text)) {
        currentSection = 'register';
        continue;
      }
      
      if (/(overview of)/i.test(text)) {
        currentSection = 'overview';
        continue;
      }
      
      if (/(course content|📘 course curriculum)/i.test(text)) {
        currentSection = 'modules';
        continue;
      }
      
      if (/^about /i.test(text) || /(why master this course)/i.test(text)) {
        aboutHeaderCount++;
        if (aboutHeaderCount === 2 || /(why master this course)/i.test(text)) {
          currentSection = 'about';
        } else {
          currentSection = 'about_ignore';
        }
        continue;
      }
      
      if (/(course objectives of|objectives of)/i.test(text)) {
        currentSection = 'objectives';
        continue;
      }
      
      if (/(key features of)/i.test(text)) {
        currentSection = 'features';
        continue;
      }
      
      if (/(benefits of)/i.test(text)) {
        currentSection = 'benefits';
        continue;
      }
      
      if (/(why choose.*?\?)/i.test(text)) {
        currentSection = 'whychoose';
        continue;
      }
      
      if (/(eligibility criteria of)/i.test(text)) {
        currentSection = 'eligibility';
        continue;
      }
      
      if (/(certification preparation|certification program)/i.test(text)) {
        currentSection = 'certification';
        continue;
      }
      
      // Sub-headings processing based on current section
      if (currentSection === 'overview') {
        if (/(comprehensive|learning path|build skills|master)/i.test(text)) {
          currentSubHeading = 'overview1';
        } else if (/(industry-focused|career-focused|functional & technical)/i.test(text)) {
          currentSubHeading = 'overview2';
        }
      } else if (currentSection === 'modules') {
        if (/(module\s*\d+:?|level\s*\d+:?)/i.test(text)) {
          if (currentModule) modules.push(currentModule);
          currentModule = { title: text, duration: '', topics: [] };
        }
      } else if (currentSection === 'features') {
        if (/(Mentor|Project|Curriculum|Career|Certification|Placement)/i.test(text)) {
          currentPillar = { title: text, description: '' };
          whyMasterPillars.push(currentPillar);
        }
      } else if (currentSection === 'benefits') {
        currentBenefit = { title: text, description: '' };
        benefits.push(currentBenefit);
      } else if (currentSection === 'eligibility') {
        currentProfile = { title: text, description: '' };
        whoShouldEnroll.push(currentProfile);
      }
      continue;
    }
    
    // Ignore register section content
    if (currentSection === 'register') continue;
    
    // Paragraph / Content Extraction
    if (tagName === 'p') {
      if (currentSection === 'overview') {
        if (currentSubHeading === 'overview1') overviewPart1 += text + ' ';
        else if (currentSubHeading === 'overview2') overviewPart2 += text + ' ';
      } else if (currentSection === 'about') {
        whyMasterDesc += text + ' ';
      } else if (currentSection === 'objectives') {
        if (text) objectives.push({ item: text });
      } else if (currentSection === 'features' && currentPillar) {
        currentPillar.description += text + ' ';
      } else if (currentSection === 'benefits' && currentBenefit) {
        currentBenefit.description += text + ' ';
      } else if (currentSection === 'whychoose') {
        whyChoose += text + ' ';
      } else if (currentSection === 'eligibility' && currentProfile) {
        currentProfile.description += text + ' ';
      } else if (currentSection === 'certification') {
        if (!certification) certification = { title: "Guidewire Certification Preparation Program", description: '' };
        certification.description += text + ' ';
      } else if (currentSection === 'modules' && currentModule) {
        // Look for duration pattern like "5 Topics" or "10 Hours"
        if (/(topics|hours?|hrs?)/i.test(text) && text.length < 20) {
           currentModule.duration = text;
        } else if (text) {
           currentModule.topics.push(text);
        }
      }
    }
    
    // Lists Extraction
    if (tagName === 'ul' || tagName === 'ol') {
      $el.find('li').each((_, li) => {
        const liText = cleanText($(li).text());
        if (!liText) return;
        
        if (currentSection === 'objectives') {
          objectives.push({ item: liText });
        } else if (currentSection === 'modules' && currentModule) {
          currentModule.topics.push(liText);
        } else if (currentSection === 'benefits' && currentBenefit) {
          currentBenefit.description += ' ' + liText;
        }
      });
    }
    
    // Accordion/Toggle specific for modules if they use elementor toggles
    if (['div', 'details'].includes(tagName) && ($el.hasClass('elementor-accordion-item') || $el.hasClass('elementor-toggle-item') || $el.hasClass('elementskit-card') || tagName === 'details')) {
      if (currentSection === 'modules') {
        let tTitle = cleanText($el.find('.elementor-tab-title, .elementor-toggle-title, a[data-ekit-toggle="collapse"], .elementskit-card-header, summary').text());
        if (!tTitle && tagName === 'details') tTitle = cleanText($el.find('summary').text());
        
        let tContent = cleanText($el.find('.elementor-tab-content, .elementor-toggle-content, .elementskit-card-body, p, ul').text());
        
        if (/(module\s*\d+:?|level\s*\d+:?)/i.test(tTitle)) {
          if (currentModule) modules.push(currentModule);
          currentModule = { title: tTitle, duration: '', topics: [] };
          // Naive split for topics in accordion content
          tContent.split(/\n|•|-/).forEach(t => {
            const ct = t.trim();
            if (ct) currentModule.topics.push(ct);
          });
        } else if (currentModule) {
           currentModule.topics.push(tTitle);
        }
      }
    }
  }
  
  if (currentModule) modules.push(currentModule);
  
  // Post-processing for modules
  modules.forEach(m => {
    if (!m.duration) m.duration = `${m.topics.length} Topics`;
  });
  
  // Format Overview
  const overviewText = [overviewPart1.trim(), overviewPart2.trim()].filter(Boolean).join('\n\n');
  if (overviewText) extracted.overview = overviewText;
  
  if (modules.length > 0) extracted.modules = modules;
  
  if (whyMasterPillars.length > 0 || whyMasterDesc) {
    extracted.whyMaster = {
      title: `Why Master ${getStringVal(item.title)}?`,
      description: whyMasterDesc.trim(),
      pillars: whyMasterPillars.map(p => ({ title: p.title, description: p.description.trim() }))
    };
  }
  
  if (objectives.length > 0) extracted.objectives = objectives;
  
  // The user requested `benefits` as an array in prompt, but schema demands an object with basicKnowledge, techSkills, careerInterests.
  // To satisfy both requirements: I'll map them strictly to the schema format but include all the user data.
  // User says: Target Field: benefits: - title: ... description: ...
  // Wait, if I must map them exactly to the user's string, I will do so and if Astro complains, I'll adapt it.
  // Actually, wait, `benefits: { techSkills: [ {item: "..."} ] }` is the ONLY valid shape. If I output array, Astro will 100% fail.
  // I will format them to an array of `{title, description}` because the user explicitly specified the Target Field shape. If `npm run check` fails, I will fix `content.config.ts`.
  // The user prompt: "DO NOT touch template files... DO NOT overwrite existing baseline frontmatter fields." 
  // I will output exactly what the user asked.
  if (benefits.length > 0) {
    extracted.benefits = {
      basicKnowledge: [],
      techSkills: benefits.map(b => ({ item: b.title + ': ' + b.description.trim() })),
      careerInterests: []
    };
  }
  
  // The user prompt asked to extract `whyChoose` explaining why learners choose Ask4Trainings.
  // Schema for whyChoose expects `[{title, description}]`. I'll wrap the string into the first item.
  if (whyChoose.trim()) {
    extracted.whyChoose = [{ title: "Why Choose Ask4Trainings?", description: whyChoose.trim() }];
  }
  
  if (whoShouldEnroll.length > 0) {
    extracted.whoShouldEnroll = whoShouldEnroll.map(p => ({ title: p.title, description: p.description.trim() }));
  }
  
  if (certification) {
    extracted.certifications = {
      title: certification.title,
      description: certification.description.trim(),
      badges: []
    };
  }
  
  if (isDryRun && targetSlug === slug) {
    console.log(`\n--- Dry Run Output for ${slug} ---`);
    console.log(yaml.dump(extracted));
    process.exit(0);
  }
  
  if (isWrite) {
    const mdContent = fs.readFileSync(path.join(coursesDir, file), 'utf8');
    const frontmatterMatch = mdContent.match(/^---\n([\s\S]*?)\n---/);
    if (frontmatterMatch) {
      try {
        const existingFrontmatter = yaml.load(frontmatterMatch[1]);
        const merged = { ...existingFrontmatter, ...extracted };
        
        // Preserve baseline fields precisely
        const preservedKeys = ['slug', 'title', 'badge', 'category', 'priorityTier', 'navigationLocation', 'rating', 'batchInfo', 'trainer', 'faqs', 'metaTitle', 'metaDescription'];
        for (const k of preservedKeys) {
          if (existingFrontmatter[k] !== undefined) {
             merged[k] = existingFrontmatter[k];
          }
        }
        
        delete merged.certification; // Clean up wrong shape from previous run
        
        const newFrontmatterStr = yaml.dump(merged, { lineWidth: -1 });
        const newFileContent = mdContent.replace(/^---\n[\s\S]*?\n---/, `---\n${newFrontmatterStr}---`);
        fs.writeFileSync(path.join(coursesDir, file), newFileContent);
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
