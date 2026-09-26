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
  let whyMasterPillars = []; // keeping it for safety although we stopped using it
  let currentPillar = null;
  let keyFeatures = [];
  
  let benefits = [];
  let currentBenefit = null;
  
  let whyChoose = '';
  
  let whoShouldEnroll = [];
  let currentProfile = null;
  
  let jobRoles = [];
  let currentJobRole = null;
  let jobRoleTokens = [];
  let jobRoleIndex = 0;
  
  let faqs = [];
  let currentFaq = null;
  
  let certification = null;
  
  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    const $el = $(el);
    const tagName = el.tagName.toLowerCase();
    const text = cleanText($el.text());
    
    // Header detection for sections
    if (/^h[1-6]$/.test(tagName)) {
      if (/(guidewire trainer|trainer|highlights)/i.test(text)) {
        break; // Hard Stop Boundary
      }
      if (/(frequently asked questions|faq)/i.test(text)) {
        currentSection = 'faq';
        continue;
      }
      if (/(certification preparation|certification program|career-focused.*?certification)/i.test(text)) {
        currentSection = 'certification';
        continue;
      }
      if (/(job roles of)/i.test(text)) {
        currentSection = 'jobRoles';
        continue;
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
        currentSection = 'whychoosecourse';
        continue;
      }
      
      if (/(eligibility criteria of)/i.test(text)) {
        currentSection = 'eligibility';
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
        if (/(Mentor|Project|Curriculum|Career|Certification|Placement|Carrer|Placment)/i.test(text)) {
          let sanitizedTitle = text.trim();
          if (/carrer/i.test(sanitizedTitle)) sanitizedTitle = 'Career';
          if (/placment/i.test(sanitizedTitle)) sanitizedTitle = 'Placement';
          if (/curriculum/i.test(sanitizedTitle)) sanitizedTitle = 'Curriculum';
          currentPillar = { title: sanitizedTitle, description: '' };
          keyFeatures.push(currentPillar);
        }
      } else if (currentSection === 'jobRoles') {
        // jobRoles are extracted from <p> tags, not headers, unless they are short tokens
        if (text.length < 40) {
            jobRoleTokens.push(text);
        }
      } else if (currentSection === 'faq') {
         currentFaq = { question: text, answer: '' };
         faqs.push(currentFaq);
         continue;
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
        if (currentSubHeading === 'overview1') overviewPart1 += text + '\n\n';
        else if (currentSubHeading === 'overview2') overviewPart2 += text + '\n\n';
      } else if (currentSection === 'about') {
        whyMasterDesc += text + '\n\n';
      } else if (currentSection === 'objectives') {
        if (text) objectives.push(text);
      } else if (currentSection === 'features' && currentPillar) {
        currentPillar.description += text + '\n\n';
      } else if (currentSection === 'benefits' && currentBenefit) {
        currentBenefit.description += text + '\n\n';
      } else if (currentSection === 'whychoosecourse') {
        whyChoose += text + '\n\n';
      } else if (currentSection === 'eligibility' && currentProfile) {
        currentProfile.description += text + '\n\n';
      } else if (currentSection === 'jobRoles') {
        if (text.length >= 40) {
          let cleanDesc = text.replace(/востребован/gi, "in-demand");
          
          let extractedTitle = null;
          const match1 = cleanDesc.match(/^(?:A|An)\s+([A-Z][a-zA-Z0-9\s]+?)\s+(?:in\s+[A-Za-z0-9\s]+?)\s+(?:uses|specializes|is|works|focuses|plays|designs|delivers)/i);
          if (match1) {
            extractedTitle = match1[1].trim();
          } else {
            const match2 = cleanDesc.match(/^(?:A|An)\s+([A-Z][a-zA-Z0-9\s]+?)\s+(?:specializes|is\s+responsible|works|focuses|plays|designs|delivers|builds)/i);
            if (match2) {
              extractedTitle = match2[1].trim();
            }
          }
          
          if (!extractedTitle && jobRoleTokens.length > jobRoleIndex) {
             extractedTitle = jobRoleTokens[jobRoleIndex];
          }
          
          let competencies = ["Enterprise Standards", "Industry Best Practices"];
          if (extractedTitle) {
            if (/Developer/i.test(extractedTitle)) {
               competencies = ["Gosu / Core Scripting", "API Integration", "Architecture Design"];
            } else if (/Configurator/i.test(extractedTitle)) {
               competencies = ["Data Model Configuration", "PCF Screen Design", "Business Rules"];
            } else if (/Analyst/i.test(extractedTitle)) {
               competencies = ["Requirement Gathering", "Workflow Analysis", "Domain Best Practices"];
            }
          }
          
          jobRoles.push({ role: extractedTitle || "Consultant", description: cleanDesc + '\n\n', competencies });
          jobRoleIndex++;
        }
      } else if (currentSection === 'faq' && currentFaq) {
        currentFaq.answer += text + '\n\n';
      } else if (currentSection === 'certification') {
        if (!certification) certification = { title: "Industry Recognized Certification", description: '' };
        certification.description += text + '\n\n';
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
          objectives.push(liText);
        } else if (currentSection === 'modules' && currentModule) {
          currentModule.topics.push(liText);
        } else if (currentSection === 'benefits' && currentBenefit) {
          if (!currentBenefit.points) currentBenefit.points = [];
          currentBenefit.points.push(liText);
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
      } else if (currentSection === 'faq') {
        let tTitle = cleanText($el.find('.elementor-tab-title, .elementor-toggle-title, a[data-ekit-toggle="collapse"], .elementskit-card-header, summary').text());
        if (!tTitle && tagName === 'details') tTitle = cleanText($el.find('summary').text());
        
        let tContent = cleanText($el.find('.elementor-tab-content, .elementor-toggle-content, .elementskit-card-body, p, ul').text());
        
        if (tTitle && tContent) {
           faqs.push({ question: tTitle, answer: tContent });
        }
      }
    }
    
    // Check divs for jobRoles if they weren't in <p>
    if (tagName === 'div' && currentSection === 'jobRoles') {
      if (text.length >= 40) {
        // avoid duplicating the same text if there are nested divs
        if (!jobRoles.some(j => j.description.includes(text) || text.includes(j.description))) {
          let cleanDesc = text.replace(/востребован/gi, "in-demand");
          let extractedTitle = null;
          const match1 = cleanDesc.match(/^(?:A|An)\s+([A-Z][a-zA-Z0-9\s]+?)\s+(?:in\s+[A-Za-z0-9\s]+?)\s+(?:uses|specializes|is|works|focuses|plays|designs|delivers)/i);
          if (match1) {
            extractedTitle = match1[1].trim();
          } else {
            const match2 = cleanDesc.match(/^(?:A|An)\s+([A-Z][a-zA-Z0-9\s]+?)\s+(?:specializes|is\s+responsible|works|focuses|plays|designs|delivers|builds)/i);
            if (match2) {
              extractedTitle = match2[1].trim();
            }
          }
          if (!extractedTitle && jobRoleTokens.length > jobRoleIndex) {
             extractedTitle = jobRoleTokens[jobRoleIndex];
          }
          
          let competencies = ["Enterprise Standards", "Industry Best Practices"];
          if (extractedTitle) {
            if (/Developer/i.test(extractedTitle)) {
               competencies = ["Gosu / Core Scripting", "API Integration", "Architecture Design"];
            } else if (/Configurator/i.test(extractedTitle)) {
               competencies = ["Data Model Configuration", "PCF Screen Design", "Business Rules"];
            } else if (/Analyst/i.test(extractedTitle)) {
               competencies = ["Requirement Gathering", "Workflow Analysis", "Domain Best Practices"];
            }
          }
          
          jobRoles.push({ role: extractedTitle || "Consultant", description: cleanDesc + '\n\n', competencies });
          jobRoleIndex++;
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
  
  if (keyFeatures.length > 0) {
    extracted.keyFeatures = keyFeatures.map(p => ({ title: p.title, description: p.description.trim() }));
  }
  
  if (jobRoles.length > 0) {
    extracted.jobRoles = jobRoles.map(j => ({
      role: j.role,
      description: j.description.trim(),
      competencies: j.competencies || ["Industry Best Practices", "Tool Mastery"]
    }));
  }
  
  if (faqs.length > 0) {
    extracted.faqs = faqs.map(f => ({
      question: f.question.trim(),
      answer: f.answer.trim()
    })).filter(f => f.question && f.answer);
  }
  
  if (whyMasterDesc) {
    extracted.whyMaster = {
      title: `Why Master ${getStringVal(item.title)}?`,
      description: whyMasterDesc.trim()
    };
  }
  
  if (objectives.length > 0) extracted.objectives = objectives;
  
  if (benefits.length > 0) {
    extracted.benefits = benefits.map(b => ({
      title: b.title,
      description: b.description.trim(),
      points: b.points || []
    }));
  }
  
  // The user prompt asked to extract `whyChooseCourse` instead of replacing `whyChoose`.
  if (whyChoose.trim()) {
    extracted.whyChooseCourse = whyChoose.trim();
  }
  
  if (whoShouldEnroll.length > 0) {
    whoShouldEnroll = whoShouldEnroll.filter(item => 
      !/certification/i.test(item.title) && 
      !/certification/i.test(item.description?.slice(0, 30))
    );
    if (whoShouldEnroll.length > 0) {
      extracted.whoShouldEnroll = whoShouldEnroll.map(p => ({ title: p.title, description: p.description.trim() }));
    }
  }
  
  if (certification) {
    extracted.certification = {
      title: "Industry Recognized Certification",
      description: certification.description.trim()
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
        const preservedKeys = ['slug', 'title', 'badge', 'category', 'priorityTier', 'navigationLocation', 'rating', 'batchInfo', 'trainer', 'metaTitle', 'metaDescription'];
        for (const k of preservedKeys) {
          if (existingFrontmatter[k] !== undefined) {
             merged[k] = existingFrontmatter[k];
          }
        }
        
        delete merged.whyChoose; // Clean up wrong extraction from previous run
        delete merged.certifications; // Clean up wrong extraction from previous run
        
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
