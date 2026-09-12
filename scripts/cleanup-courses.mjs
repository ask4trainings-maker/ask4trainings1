/**
 * scripts/cleanup-courses.mjs
 * ────────────────────────────────────────────────────────────────────
 * Phase 1 — Content Collection Audit & Phantom Purge
 *
 * SOURCE OF TRUTH: docs/ask4traingings.csv (Screaming Frog, Status 200)
 *
 * Actions:
 *   1. Parse Screaming Frog CSV, extract all 200-OK HTML course slugs.
 *   2. Scan src/content/courses/*.md.
 *   3. Delete phantom .md files whose slug is NOT in the live 200 set.
 *   4. For retained files, patch legacyUrl to match exact live URL with trailing slash.
 *   5. Emit a detailed audit report.
 *
 * Usage: node scripts/cleanup-courses.mjs [--dry-run]
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DRY_RUN = process.argv.includes('--dry-run');

if (DRY_RUN) console.log('🔍 DRY-RUN mode — no files will be modified.\n');

// ── CSV Parser ───────────────────────────────────────────────────────
function parseLine(line) {
  const result = []; let cur = ''; let inQ = false;
  for (const ch of line) {
    if (ch === '"') { inQ = !inQ; }
    else if (ch === ',' && !inQ) { result.push(cur.replace(/^"|"$/g, '')); cur = ''; }
    else cur += ch;
  }
  result.push(cur.replace(/^"|"$/g, ''));
  return result;
}
function parseCSV(fp) {
  const raw = fs.readFileSync(fp, 'utf-8').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = raw.split('\n').filter(l => l.trim());
  const headers = parseLine(lines[0]).map(h => h.replace(/^\uFEFF/, ''));
  return lines.slice(1).map(line => {
    const vals = parseLine(line);
    const obj = {};
    headers.forEach((h, i) => { obj[h] = (vals[i] ?? '').trim(); });
    return obj;
  });
}

// ── Configuration ────────────────────────────────────────────────────
const FROG_CSV = path.join(ROOT, 'docs', 'ask4traingings.csv');
const COURSES_DIR = path.join(ROOT, 'src', 'content', 'courses');

// Pages that are static routes (not courses), never delete if present
const STATIC_SLUGS = new Set([
  'about-us', 'contact-us', 'student-registration', 'course-list',
  'new-courses', 'courses', 'privacy-policy', 'terms-of-service',
]);
// Archive/taxonomy prefix patterns — not courses
const ARCHIVE_PREFIXES = [
  'category/', 'author/', 'tag/', 'blog', 'events',
  'courses/', 'course-tag', 'home/', 'wp-', 'coursesguidewire',
];
// File extensions to skip
const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.ico', '.pdf'];

// ── Step 1: Load Screaming Frog 200-OK HTML slugs ───────────────────
console.log('📂 Loading Screaming Frog crawl…');
const frogRows = parseCSV(FROG_CSV);
const liveUrlMap = new Map(); // slug → full canonical URL

for (const row of frogRows) {
  const status = row['Status Code'];
  const contentType = row['Content Type'] || '';
  const address = (row['Address'] || '').trim();

  if (status !== '200') continue;
  if (!contentType.includes('text/html')) continue;
  if (!address.startsWith('http')) continue;
  if (IMAGE_EXTS.some(e => address.toLowerCase().endsWith(e))) continue;

  let urlPath;
  try { urlPath = new URL(address).pathname; } catch { continue; }

  const slug = urlPath.replace(/^\/|\/$/g, '');
  if (!slug) continue; // skip root
  if (STATIC_SLUGS.has(slug)) continue;
  if (ARCHIVE_PREFIXES.some(p => slug.startsWith(p))) continue;

  const canonicalUrl = `https://ask4trainings.com/${slug}/`;
  liveUrlMap.set(slug, canonicalUrl);
}

console.log(`✅ Live verified course slugs: ${liveUrlMap.size}`);

// ── Step 2: Scan existing markdown files ─────────────────────────────
const mdFiles = fs.readdirSync(COURSES_DIR).filter(f => f.endsWith('.md'));
console.log(`📋 Existing markdown files: ${mdFiles.length}\n`);

// ── Frontmatter patcher ──────────────────────────────────────────────
function parseFrontmatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return null;
  return { yaml: m[1], body: m[2] };
}

function patchLegacyUrl(yaml, newUrl) {
  const lines = yaml.split('\n');
  let patched = false;
  const result = lines.map(l => {
    if (/^legacyUrl:\s*/.test(l)) {
      patched = true;
      return `legacyUrl: "${newUrl}"`;
    }
    return l;
  });
  if (!patched) result.push(`legacyUrl: "${newUrl}"`);
  return result.join('\n');
}

// ── Step 3 & 4: Purge phantoms, patch legacyUrl ──────────────────────
const stats = { purged: [], retained: [], legacyPatched: 0, errors: [] };

for (const filename of mdFiles) {
  const slug = filename.replace(/\.md$/, '');
  const filePath = path.join(COURSES_DIR, filename);

  if (!liveUrlMap.has(slug)) {
    // PHANTOM — delete
    stats.purged.push(slug);
    if (!DRY_RUN) {
      try {
        fs.unlinkSync(filePath);
      } catch (e) {
        stats.errors.push(`Failed to delete ${filename}: ${e.message}`);
      }
    }
  } else {
    // RETAINED — patch legacyUrl if necessary
    stats.retained.push(slug);
    const canonicalUrl = liveUrlMap.get(slug);

    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed = parseFrontmatter(raw);
      if (!parsed) {
        stats.errors.push(`Cannot parse frontmatter in ${filename}`);
        continue;
      }

      // Check if legacyUrl already matches
      const currentUrlMatch = parsed.yaml.match(/^legacyUrl:\s*"?([^"\n]+)"?\s*$/m);
      const currentUrl = currentUrlMatch ? currentUrlMatch[1].trim() : '';

      if (currentUrl !== canonicalUrl) {
        const patchedYaml = patchLegacyUrl(parsed.yaml, canonicalUrl);
        const updated = `---\n${patchedYaml}\n---\n${parsed.body}`;
        if (!DRY_RUN) fs.writeFileSync(filePath, updated);
        stats.legacyPatched++;
      }
    } catch (e) {
      stats.errors.push(`Error processing ${filename}: ${e.message}`);
    }
  }
}

// ── Report ────────────────────────────────────────────────────────────
console.log('═══════════════════════════════════════════');
console.log('       CONTENT COLLECTION AUDIT REPORT');
console.log('═══════════════════════════════════════════');
console.log(`Retained (live-verified):    ${stats.retained.length}`);
console.log(`Purged (phantom):            ${stats.purged.length}${DRY_RUN ? ' [DRY-RUN]' : ''}`);
console.log(`legacyUrl patched:           ${stats.legacyPatched}`);
console.log(`Errors:                      ${stats.errors.length}`);

if (stats.purged.length > 0) {
  console.log('\nPurged files:');
  stats.purged.forEach(s => console.log(`  ✗ ${s}.md`));
}
if (stats.errors.length > 0) {
  console.log('\nErrors:');
  stats.errors.forEach(e => console.log(`  ⚠ ${e}`));
}
console.log('\n✅ Content audit complete.');
