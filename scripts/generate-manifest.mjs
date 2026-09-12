/**
 * generate-manifest.mjs
 * Auto-detects Screaming Frog and GSC CSVs from docs/ by header signature.
 * Outputs validated JSON to migration-manifest.json.
 * Usage: node scripts/generate-manifest.mjs
 */
import fs from 'fs';
import path from 'path';
import { URL as NodeURL } from 'url';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DOCS_DIR = path.join(ROOT, 'docs');
const OUT_FILE = path.join(ROOT, 'migration-manifest.json');

// ── CSV parser (handles quoted fields) ──────────────────────────────────────
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuote = !inQuote; }
    else if (ch === ',' && !inQuote) { result.push(current); current = ''; }
    else { current += ch; }
  }
  result.push(current);
  return result.map(s => s.replace(/^"|"$/g, '').trim());
}

function parseCSV(fp) {
  const raw = fs.readFileSync(fp, 'utf-8').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = raw.split('\n').filter(l => l.trim());
  const headers = parseCSVLine(lines[0]).map(h => h.replace(/^\uFEFF/, '')); // strip BOM
  return lines.slice(1).map(line => {
    const vals = parseCSVLine(line);
    const obj = {};
    headers.forEach((h, i) => { obj[h] = vals[i] ?? ''; });
    return obj;
  });
}

/** Find a CSV in dir whose first row contains sigCol */
function loadCsvByHeader(dir, sigCol) {
  for (const f of fs.readdirSync(dir)) {
    if (!f.toLowerCase().endsWith('.csv')) continue;
    const fp = path.join(dir, f);
    try {
      const firstLine = fs.readFileSync(fp, 'utf-8').split(/\r?\n/)[0];
      const headers = parseCSVLine(firstLine).map(h => h.replace(/^\uFEFF/, ''));
      if (headers.includes(sigCol)) {
        const rows = parseCSV(fp);
        console.log(`  Detected ${sigCol} → ${f} (${rows.length} rows)`);
        return rows;
      }
    } catch { /* skip unreadable */ }
  }
  return null;
}

// ── Category classifier (matches Zod enum exactly) ──────────────────────────
const VALID_CATEGORIES = [
  'guidewire', 'siemens', 'new-courses', 'cloud-computing',
  'oracle', 'devops', 'development', 'ms-d365',
  'sap', 'trending-courses', 'other-tools',
];

function assignCategory(slug) {
  if (slug.includes('guidewire')) return 'guidewire';
  if (slug.includes('teamcenter') || slug.includes('polarion') || slug.includes('camstar') || slug.includes('windchill') || slug.includes('ptc')) return 'siemens';
  if (slug.includes('sap') || slug.includes('ariba') || slug.includes('successfactor')) return 'sap';
  if (slug.includes('oracle') || slug.includes('flexcube') || slug.includes('peoplesoft') || slug.includes('otm') || slug.includes('apex')) return 'oracle';
  if (slug.includes('salesforce') || slug.includes('servicenow') || slug.includes('duck-creek') || slug.includes('workday') || slug.includes('kinaxis') || slug.includes('palantir') || slug.includes('coupa') || slug.includes('sailpoint')) return 'trending-courses';
  if (slug.includes('aws') || slug.includes('azure') || slug.includes('gcp') || slug.includes('oci') || slug.includes('cloud') || slug.includes('snowflake')) return 'cloud-computing';
  if (slug.includes('java') || slug.includes('python') || slug.includes('mern') || slug.includes('react') || slug.includes('development') || slug.includes('data-science')) return 'development';
  if (slug.includes('docker') || slug.includes('kubernetes') || slug.includes('terraform') || slug.includes('ci-cd') || slug.includes('devops')) return 'devops';
  if (slug.includes('dynamics') || slug.includes('d365') || slug.includes('ms-') || slug.includes('microsoft')) return 'ms-d365';
  if (slug.includes('new-courses') || slug.includes('cybersecurity') || slug.includes('cyber')) return 'new-courses';
  return 'other-tools';
}

// ── Image extension filter ───────────────────────────────────────────────────
const IMAGE_EXTS = ['.jpeg', '.jpg', '.png', '.webp', '.gif', '.svg', '.ico'];

// ── Archive slug patterns ───────────────────────────────────────────────────
function classifyType(slug) {
  if (['about-us', 'contact-us', 'student-registration', 'course-list', 'new-courses', 'courses'].includes(slug))
    return 'static-page';
  if (
    slug.startsWith('category/') || slug.startsWith('author/') ||
    slug.startsWith('tag/') || slug.includes('/page/') ||
    slug.startsWith('events') || slug.startsWith('blog') ||
    slug.startsWith('courses/') || slug.startsWith('course-tag') ||
    slug.startsWith('home/') || slug.startsWith('wp-') ||
    slug.startsWith('coursesguidewire')
  ) return 'archive';
  return 'course';
}

// ── Main ─────────────────────────────────────────────────────────────────────
console.log('📋 Detecting CSVs in docs/ …');
const frogRows = loadCsvByHeader(DOCS_DIR, 'Address');
const mapRows  = loadCsvByHeader(DOCS_DIR, 'URL (GSC / Live)');

if (!frogRows) { console.error('❌ Screaming Frog CSV (Address column) not found in docs/'); process.exit(1); }
if (!mapRows)  { console.error('❌ GSC Migration Map CSV (URL (GSC / Live) column) not found in docs/'); process.exit(1); }

// Index by URL
const frogIndex = {};
for (const r of frogRows) { const u = (r['Address'] || '').trim(); if (u) frogIndex[u] = r; }
const mapIndex  = {};
for (const r of mapRows)  { const u = (r['URL (GSC / Live)'] || '').trim(); if (u) mapIndex[u] = r; }

const allUrls = new Set([...Object.keys(frogIndex), ...Object.keys(mapIndex)]);
const manifest = [];

for (const rawUrl of allUrls) {
  if (!rawUrl.startsWith('http')) continue;
  if (IMAGE_EXTS.some(e => rawUrl.toLowerCase().endsWith(e))) continue;

  let urlPath;
  try { urlPath = new NodeURL(rawUrl).pathname; } catch { continue; }

  const slug = urlPath.replace(/^\/|\/$/g, '');
  if (!slug) continue;

  const fRow = frogIndex[rawUrl] || {};
  const mRow = mapIndex[rawUrl] || {};

  const type = classifyType(slug);
  const legacyUrl = `https://ask4trainings.com/${slug}/`;

  const rawTitle = (fRow['Title 1'] || '').trim();
  const rawH1 = (fRow['H1-1'] || '').trim();
  const rawMeta = (fRow['Meta Description 1'] || '').trim();
  const clicks = parseInt(mRow['Clicks (Last 12 Mo)'] || '0') || 0;
  const impressions = parseInt(mRow['Impressions'] || fRow['Word Count'] || '0') || 0; // Note: Impressions from map CSV

  const title = rawTitle || slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const h1 = rawH1 || title;
  const metaDescription = rawMeta.slice(0, 160);
  const category = type === 'course' ? assignCategory(slug) : null;

  const entry = { slug, legacyUrl, type, title, h1, metaDescription, gscClicks: clicks, gscImpressions: impressions };
  if (category) entry.category = category;

  manifest.push(entry);
}

// Sort: courses first, then archives, then statics
manifest.sort((a, b) => {
  const order = { course: 0, archive: 1, 'static-page': 2 };
  return (order[a.type] ?? 3) - (order[b.type] ?? 3);
});

fs.writeFileSync(OUT_FILE, JSON.stringify(manifest, null, 2));

const courses  = manifest.filter(m => m.type === 'course');
const archives = manifest.filter(m => m.type === 'archive');
const statics  = manifest.filter(m => m.type === 'static-page');

console.log(`\n✅ Generated migration-manifest.json:`);
console.log(`   Total:        ${manifest.length}`);
console.log(`   Courses:      ${courses.length}`);
console.log(`   Archive:      ${archives.length}`);
console.log(`   Static pages: ${statics.length}`);
console.log(`   Output:       ${OUT_FILE}`);
