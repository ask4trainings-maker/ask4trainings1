/**
 * migrate-content.mjs
 * Non-destructive upsert of course markdown files and 301 redirect generation.
 *
 * Strategy:
 *   - Existing files: update ONLY seo.metaTitle, seo.metaDescription, legacyUrl,
 *     legacyImpressions in frontmatter — rich syllabus, FAQs, body text are preserved.
 *   - Missing files: generate new files with schema-compliant blueprints.
 *   - Redirects: merge new redirect rules into public/_redirects (no-clobber).
 *
 * Usage: node scripts/migrate-content.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const MANIFEST_PATH   = path.join(ROOT, 'migration-manifest.json');
const COURSES_DIR     = path.join(ROOT, 'src', 'content', 'courses');
const REDIRECTS_PATH  = path.join(ROOT, 'public', '_redirects');

// ── Valid Zod categories (must stay in sync with src/content.config.ts) ─────
const VALID_CATEGORIES = new Set([
  'guidewire', 'siemens', 'new-courses', 'cloud-computing',
  'oracle', 'devops', 'development', 'ms-d365',
  'sap', 'trending-courses', 'other-tools',
]);

function assignCategory(slug) {
  if (slug.includes('guidewire')) return 'guidewire';
  if (slug.includes('teamcenter') || slug.includes('polarion') || slug.includes('camstar') || slug.includes('windchill') || slug.includes('ptc')) return 'siemens';
  if (slug.includes('sap') || slug.includes('ariba') || slug.includes('successfactor')) return 'sap';
  if (slug.includes('oracle') || slug.includes('flexcube') || slug.includes('peoplesoft') || slug.includes('otm') || slug.includes('apex')) return 'oracle';
  if (slug.includes('salesforce') || slug.includes('servicenow') || slug.includes('duck-creek') || slug.includes('workday') || slug.includes('kinaxis') || slug.includes('palantir') || slug.includes('coupa') || slug.includes('sailpoint')) return 'trending-courses';
  if (slug.includes('aws') || slug.includes('azure') || slug.includes('gcp') || slug.includes('oci') || slug.includes('cloud') || slug.includes('snowflake')) return 'cloud-computing';
  if (slug.includes('java') || slug.includes('python') || slug.includes('mern') || slug.includes('react') || slug.includes('development') || slug.includes('data-science')) return 'development';
  if (slug.includes('docker') || slug.includes('kubernetes') || slug.includes('terraform') || slug.includes('ci-cd') || slug.includes('devops')) return 'devops';
  if (slug.includes('dynamics') || slug.includes('d365') || slug.includes('microsoft')) return 'ms-d365';
  if (slug.includes('cybersecurity') || slug.includes('cyber')) return 'new-courses';
  return 'other-tools';
}

// ── Frontmatter parser/serialiser ───────────────────────────────────────────
/**
 * Parse raw markdown file into { frontmatter: Record, body: string }
 * Returns null if frontmatter block cannot be found.
 */
function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return null;
  return { yamlBlock: match[1], body: match[2] };
}

/**
 * Patch specific top-level keys in a YAML block using regex line replacement.
 * Also handles nested `seo:` block keys.
 * Preserves all other content exactly.
 */
function patchYamlBlock(yaml, patches) {
  let lines = yaml.split('\n');

  for (const [key, value] of Object.entries(patches)) {
    const escaped = String(value).replace(/"/g, '\\"');

    if (key.startsWith('seo.')) {
      // Handle nested seo block
      const subKey = key.slice(4); // e.g. 'metaTitle'
      let inSeo = false;
      let seoPatched = false;
      for (let i = 0; i < lines.length; i++) {
        if (/^seo:\s*$/.test(lines[i])) { inSeo = true; continue; }
        if (inSeo) {
          if (/^\S/.test(lines[i])) { inSeo = false; continue; } // left seo block
          const subMatch = lines[i].match(new RegExp(`^(\\s+${subKey}:\\s*)(.*)$`));
          if (subMatch) {
            lines[i] = `${subMatch[1]}"${escaped}"`;
            seoPatched = true;
          }
        }
      }
      // If seo block didn't exist, append it
      if (!seoPatched) {
        const seoIdx = lines.findIndex(l => /^seo:\s*$/.test(l));
        if (seoIdx >= 0) {
          lines.splice(seoIdx + 1, 0, `  ${subKey}: "${escaped}"`);
        }
      }
    } else {
      // Top-level key replacement
      let patched = false;
      for (let i = 0; i < lines.length; i++) {
        const m = lines[i].match(new RegExp(`^(${key}:\\s*)(.*)$`));
        if (m) {
          // Preserve numeric values without quotes
          if (typeof value === 'number') {
            lines[i] = `${key}: ${value}`;
          } else {
            lines[i] = `${key}: "${escaped}"`;
          }
          patched = true;
          break;
        }
      }
      if (!patched) {
        // Append if key not found
        if (typeof value === 'number') {
          lines.push(`${key}: ${value}`);
        } else {
          lines.push(`${key}: "${escaped}"`);
        }
      }
    }
  }

  return lines.join('\n');
}

// ── Sanitise title (remove pipe suffixes like " | #1Course") ─────────────────
function cleanTitle(raw) {
  if (!raw) return '';
  // Remove " | Ask4Trainings" and similar suffixes; remove "#1", "NO.1" decorators
  return raw
    .replace(/\s*\|.*$/, '')
    .replace(/\b(#1|NO\.1|#1|Best\s+|NO\s*\.\s*1)\s*/gi, '')
    .trim();
}

// ── Generate brand new course markdown ───────────────────────────────────────
function generateCourseMarkdown(entry) {
  const { slug, legacyUrl, title: rawTitle, h1, metaDescription, gscImpressions } = entry;
  const category = entry.category || assignCategory(slug);
  const safeCategory = VALID_CATEGORIES.has(category) ? category : 'other-tools';

  const cleanedTitle = cleanTitle(rawTitle) || cleanTitle(h1) || slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const courseName = cleanedTitle;

  // seo.metaTitle: prefer scraped Title 1 (≤60 chars), else truncate
  let metaTitle = rawTitle ? rawTitle.trim() : `${courseName} | Ask 4 Trainings`;
  if (metaTitle.length > 60) metaTitle = metaTitle.substring(0, 57) + '...';

  const metaDesc = metaDescription && metaDescription.length > 10
    ? metaDescription.slice(0, 160)
    : `Enroll in the best ${courseName}. Get hands-on experience with real-time projects, certification support, and placement assistance.`;

  // Derive a clean module name (strip "-online-training", "-in-hyderabad" etc.)
  const moduleBase = slug
    .replace(/-online-training$/, '')
    .replace(/-training$/, '')
    .replace(/-in-hyderabad$/, '')
    .replace(/-online$/, '')
    .replace(/-course$/, '')
    .split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  return `---
title: "${courseName.replace(/"/g, '\\"')}"
slug: "${slug}"
category: "${safeCategory}"
valueProp: "Master ${courseName} with our enterprise-grade curriculum and secure high-impact roles."
highlights:
  - icon: "M13 10V3L4 14h7v7l9-11h-7z"
    text: "Industry Expert Instructors"
  - icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
    text: "Real-world Projects"
  - icon: "M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
    text: "100% Placement Assistance"
syllabus:
  - module: "Module 1: Introduction to ${moduleBase}"
    topics:
      - "Architecture and Core Concepts"
      - "Installation and Setup"
      - "Navigation and UI"
  - module: "Module 2: Advanced Configuration"
    topics:
      - "Data Modeling"
      - "Business Logic Implementation"
      - "Security and Access Control"
  - module: "Module 3: Integration and APIs"
    topics:
      - "RESTful APIs and Web Services"
      - "Batch Processing"
      - "Event Messaging"
  - module: "Module 4: Real-time Project Implementation"
    topics:
      - "End to end project setup"
      - "Deployment and CI/CD"
      - "Troubleshooting and Best Practices"
batchInfo:
  format: "Online"
  duration: "45-60 Hrs"
faqs:
  - question: "Who should take this ${courseName}?"
    answer: "This course is ideal for IT professionals, developers, and analysts looking to build a career in this domain."
  - question: "Are there any prerequisites?"
    answer: "Basic understanding of IT concepts is recommended but not strictly required."
  - question: "Do you provide placement assistance?"
    answer: "Yes, we provide 100% placement assistance, resume building, and mock interviews."
seo:
  metaTitle: "${metaTitle.replace(/"/g, '\\"')}"
  metaDescription: "${metaDesc.replace(/"/g, '\\"')}"
legacyUrl: "${legacyUrl}"
legacyImpressions: ${gscImpressions || 0}
---

This is the canonical course page for ${courseName}. Start your learning journey today with Ask 4 Trainings.
`;
}

// ── Redirect destination resolver ────────────────────────────────────────────
function resolveRedirectDest(slug) {
  // Category-specific redirects to matching course catalog
  const catMap = {
    'category/guidewire':              '/guidewire-policycenter-online-training/',
    'category/guidewire-development':  '/guidewire-online-training/',
    'category/guidewire-frameworks':   '/guidewire-automation-testing-on-gt-frameworks/',
    'category/servicenow':             '/servicenow-online-training/',
    'category/teamcenter':             '/teamcenter-plm-training/',
    'category/polarion':               '/polarion-online-training/',
    'category/sap':                    '/sap-abap-online-training/',
    'category/oracle':                 '/oracle-fusion-financials-online-training/',
    'category/salesforce':             '/salesforce-cpq-online-training/',
    'category/uncategorized':          '/courses/',
    'author/admin':                    '/courses/',
  };
  // Check exact match or prefix
  for (const [pattern, dest] of Object.entries(catMap)) {
    if (slug === pattern || slug.startsWith(pattern + '/')) return dest;
  }
  if (slug.startsWith('events')) return '/courses/';
  if (slug.startsWith('author/')) return '/courses/';
  if (slug.startsWith('category/')) return '/courses/';
  if (slug.startsWith('tag/')) return '/courses/';
  if (slug.startsWith('blog')) return '/courses/';
  if (slug.startsWith('home/')) return '/';
  if (slug.startsWith('courses/') || slug === 'courses') return '/courses/';
  if (slug.startsWith('course-tag')) return '/courses/';
  if (slug.startsWith('coursesguidewire')) return '/guidewire-online-training/';
  return '/courses/';
}

// ── Main ─────────────────────────────────────────────────────────────────────
const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
fs.mkdirSync(COURSES_DIR, { recursive: true });
fs.mkdirSync(path.dirname(REDIRECTS_PATH), { recursive: true });

// Load existing redirect rules (to avoid duplicates)
let existingRedirects = '';
if (fs.existsSync(REDIRECTS_PATH)) {
  existingRedirects = fs.readFileSync(REDIRECTS_PATH, 'utf-8');
}
const existingRedirectSet = new Set(
  existingRedirects.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'))
);

const stats = { created: 0, updated: 0, skipped: 0, redirectsAdded: 0 };
const newRedirects = [];

for (const entry of manifest) {
  if (entry.type === 'course') {
    const filePath = path.join(COURSES_DIR, `${entry.slug}.md`);

    if (fs.existsSync(filePath)) {
      // ── UPSERT: preserve rich content, update only SEO metadata ──────────
      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed = parseFrontmatter(raw);

      if (!parsed) {
        console.warn(`⚠  Could not parse frontmatter in ${entry.slug}.md — skipping`);
        stats.skipped++;
        continue;
      }

      // Build patches for SEO-only fields
      const patches = {};

      if (entry.title && entry.title.trim()) {
        const cleanedMeta = entry.title.trim().length > 60
          ? entry.title.trim().substring(0, 57) + '...'
          : entry.title.trim();
        patches['seo.metaTitle'] = cleanedMeta;
      }
      if (entry.metaDescription && entry.metaDescription.length > 10) {
        patches['seo.metaDescription'] = entry.metaDescription.slice(0, 160);
      }
      if (entry.legacyUrl) {
        patches['legacyUrl'] = entry.legacyUrl;
      }
      if (entry.gscImpressions > 0) {
        patches['legacyImpressions'] = entry.gscImpressions;
      }

      const patchedYaml = patchYamlBlock(parsed.yamlBlock, patches);
      const updated = `---\n${patchedYaml}\n---\n${parsed.body}`;
      fs.writeFileSync(filePath, updated);
      stats.updated++;
    } else {
      // ── CREATE: brand new file with full blueprint ────────────────────────
      const md = generateCourseMarkdown(entry);
      fs.writeFileSync(filePath, md);
      stats.created++;
    }
  } else if (entry.type === 'archive') {
    // ── 301 Redirect rules for archive/legacy routes ─────────────────────
    const src = `/${entry.slug}/`;
    const dest = resolveRedirectDest(entry.slug);
    const rule = `${src} ${dest} 301`;
    // Also add non-trailing-slash variant to prevent loops
    const ruleNoSlash = `/${entry.slug} ${dest} 301`;

    if (!existingRedirectSet.has(rule)) {
      newRedirects.push(rule);
      existingRedirectSet.add(rule);
      stats.redirectsAdded++;
    }
    if (!existingRedirectSet.has(ruleNoSlash) && src !== dest) {
      newRedirects.push(ruleNoSlash);
      existingRedirectSet.add(ruleNoSlash);
    }
  }
}

// Append new redirect rules (non-destructive)
if (newRedirects.length > 0) {
  const existingContent = fs.existsSync(REDIRECTS_PATH)
    ? fs.readFileSync(REDIRECTS_PATH, 'utf-8').trimEnd()
    : '';
  const appended = existingContent + '\n\n# Auto-generated from migration-manifest.json\n' + newRedirects.join('\n') + '\n';
  fs.writeFileSync(REDIRECTS_PATH, appended);
}

console.log('\n✅ Content migration complete:');
console.log(`   Created:        ${stats.created} new course files`);
console.log(`   Updated:        ${stats.updated} existing course files (SEO metadata only)`);
console.log(`   Skipped:        ${stats.skipped} files (parse error)`);
console.log(`   Redirects added: ${stats.redirectsAdded} new 301 rules`);
