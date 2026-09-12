/**
 * scripts/build-redirects.mjs
 * ────────────────────────────────────────────────────────────────────
 * Phase 2 — 301 Redirect Architecture for Defunct GSC URLs
 *
 * Sources:
 *   - docs/Ask4Trainings URL Migration Map - Master Migration.csv  (GSC history)
 *   - src/content/courses/*.md  (live Astro routes after phantom purge)
 *
 * Logic:
 *   1. Build live-routes set from retained .md slugs.
 *   2. For each GSC URL NOT covered by a live route, determine the best
 *      301 destination via:
 *        a. Token-similarity matching to an active course slug.
 *        b. Category-family fallback to a category hub.
 *        c. Final fallback: /courses/
 *   3. Merge new rules into public/_redirects (no-clobber, deduped).
 *   4. Enforce trailing-slash consistency on both source and destination.
 *
 * Usage: node scripts/build-redirects.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

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

// ── Paths ────────────────────────────────────────────────────────────
const MAP_CSV = path.join(ROOT, 'docs', 'Ask4Trainings URL Migration Map - Master Migration.csv');
const COURSES_DIR = path.join(ROOT, 'src', 'content', 'courses');
const REDIRECTS_PATH = path.join(ROOT, 'public', '_redirects');

// ── Step 1: Build live active route set from retained .md files ───────
const liveSlugSet = new Set(
  fs.readdirSync(COURSES_DIR)
    .filter(f => f.endsWith('.md'))
    .map(f => f.replace(/\.md$/, ''))
);

// Add known static Astro pages (not in courses collection but real routes)
const STATIC_ROUTES = new Set([
  '', 'courses', 'about-us', 'contact-us',
]);

function isLiveRoute(slug) {
  return liveSlugSet.has(slug) || STATIC_ROUTES.has(slug);
}

// ── Step 2: Similarity-based redirect destination resolver ─────────────
// Build token index from live slugs for fuzzy matching
// Exclude generic stopwords that cause false positives
const STOPWORDS = new Set([
  'online', 'training', 'course', 'courses', 'best', 'the', 'with', 'and',
  'for', 'in', 'on', 'at', 'of', 'to', 'a', 'an', 'by', 'class', 'certification',
]);

const liveSlugTokens = [...liveSlugSet].map(slug => ({
  slug,
  tokens: new Set(slug.split('-').filter(t => t.length > 2 && !STOPWORDS.has(t))),
}));

// Manual overrides for cases the token scorer gets wrong
const MANUAL_OVERRIDES = {
  // Workday (no live workday slug)
  'workday-integration-online-training': '/salesforce-online-training/',
  'workday-financials-training': '/salesforce-online-training/',
  // SailPoint (no live sailpoint slug)
  'sailpoint-identityiq-training-in-hyderabad': '/salesforce-online-training/',
  'sailpoint-iiq-online-training': '/salesforce-online-training/',
  'sailpoint-online-training': '/salesforce-online-training/',
  // PTC Windchill → Teamcenter (closest PLM)
  'best-ptc-windchill-training-in-hyderabad': '/teamcenter-plm-training/',
  // SAP phantom → canonical SAP hub
  'sap-ariba-course-in-hyderabad': '/sap-s-4-hana-fico-online-training/',
  'sap-ariba-online-training': '/sap-s-4-hana-fico-online-training/',
  'sap-brim-course-in-hyderabad': '/sap-s-4-hana-fico-online-training/',
  'sap-brim-online-training': '/sap-s-4-hana-fico-online-training/',
  'sap-c4c-course-in-hyderabad': '/sap-s-4-hana-fico-online-training/',
  'sap-c4c-online-training': '/sap-s-4-hana-fico-online-training/',
  'sap-cpi-online-training': '/sap-s-4-hana-fico-online-training/',
  'sap-ewm-course': '/sap-mm-course-in-hyderabad/',
  'sap-tm-online-training': '/sap-s-4-hana-fico-online-training/',
  'sap-bods-online-training': '/sap-s-4-hana-fico-online-training/',
  'sap-bw-on-hana-online-training': '/sap-s-4-hana-fico-online-training/',
  'sap-bw4hana-online-training': '/sap-s-4-hana-fico-online-training/',
  'sap-abap-on-hana-online-training': '/sap-s-4-hana-fico-online-training/',
  'sap-abap-online-training': '/sap-s-4-hana-fico-online-training/',
  'sap-basis-online-training': '/sap-s-4-hana-fico-online-training/',
  'sap-ficos4-hana-training': '/sap-s-4-hana-fico-online-training/',
  'sap-fico-s4-hana-training-in-hyderabad': '/sap-s-4-hana-fico-online-training/',
  'sap-mm-course': '/sap-mm-course-in-hyderabad/',
  'sap-sd-course': '/sap-sd-course-in-hyderabad/',
  'sap-pp-online-training': '/sap-s-4-hana-fico-online-training/',
  'sap-successfactors-online-training': '/sap-s-4-hana-fico-online-training/',
  'sap-successfactors-training-in-hyderabad': '/sap-s-4-hana-fico-online-training/',
  'sap-transportation-management-training-in-hyderabad': '/sap-s-4-hana-fico-online-training/',
  'best-sap-fico-training-in-hyderabad': '/sap-s-4-hana-fico-online-training/',
  'best-sap-abap-on-hana-training-in-hyderabad': '/sap-s-4-hana-fico-online-training/',
  'best-sap-basis-training-in-hyderabad': '/sap-s-4-hana-fico-online-training/',
  'best-sap-cpi-training-in-hyderabad': '/sap-s-4-hana-fico-online-training/',
  'best-sap-sd-training-in-hyderabad': '/sap-sd-course-in-hyderabad/',
  'best-sap-security-training-in-hyderabad': '/sap-s-4-hana-fico-online-training/',
  // Guidewire phantom → canonical guidewire hub
  'guidewire-online-training': '/guidewire-policycenter-online-training/',
  'guidewire-billingcenter-online-training': '/guidewire-policycenter-online-training/',
  'guidewire-billing-center-course': '/guidewire-policycenter-online-training/',
  'guidewire-cloud-online-training': '/guidewire-policycenter-online-training/',
  'guidewire-jutro-online-training': '/guidewire-policycenter-online-training/',
  'guidewire-datahub-infocenter-online-training': '/guidewire-policycenter-online-training/',
  'guidewire-rating-management-online-training': '/guidewire-rating-online-training/',
  'guidewire-testing-stlf-online-training': '/best-guidewire-testing-stlf-online-training/',
  'guidewire-training-in-hyderabad': '/guidewire-business-analyst-training-in-hyderabad/',
  // Oracle phantom → canonical oracle hub
  'oracle-cloud-infrastructure-oci-training-in-hyderabad': '/oracle-fusion-hcm-online-training/',
  'oracle-apex-online-training': '/oracle-fusion-financials-online-training/',
  'oracle-integration-cloud-oic-online-training': '/oracle-fusion-financials-online-training/',
  'oracle-transportation-management-otm-training': '/oracle-fusion-financials-online-training/',
  'oracle-peoplesoft-online-training': '/oracle-fusion-financials-online-training/',
  'oracle-fusion-scm-online-training': '/oracle-fusion-financials-online-training/',
  'oracle-fusion-technical-online-training': '/oracle-fusion-financials-online-training/',
  // Salesforce phantom
  'salesforce-cpq-online-training': '/salesforce-revenue-cloud-advanced-training/',
  'salesforce-cpq-advanced-training': '/salesforce-revenue-cloud-advanced-training/',
  'salesforce-b2b-commerce-cloud-training': '/salesforce-revenue-cloud-advanced-training/',
  'salesforce-data-cloud-online-training': '/salesforce-online-training/',
  'salesforce-omnistudio-online-training': '/salesforce-online-training/',
  'salesforce-velocity-online-training': '/salesforce-revenue-cloud-advanced-training/',
  'best-salesforce-cpq-training-in-hyderabad': '/salesforce-revenue-cloud-advanced-training/',
  // ServiceNow phantom
  'servicenow-csm-training': '/servicenow-online-training/',
  'servicenow-csm-training-in-hyderabad': '/servicenow-online-training/',
  'servicenow-grc-training': '/servicenow-online-training/',
  'servicenow-hrsd-training': '/servicenow-online-training/',
  'servicenow-itom-training': '/servicenow-online-training/',
  'servicenow-sam-training': '/servicenow-online-training/',
  'servicenow-secops-training': '/servicenow-online-training/',
  // Snowflake
  'snowflake-training-in-hyderabad': '/snowflake-online-training/',
  // Static/utility
  'student-registration': '/contact-us/',
  'course-list': '/',
  'courses': '/courses/',
};

/**
 * Score similarity between a phantom slug and a live slug by token overlap.
 * Prioritises exact prefix/suffix match and shared meaningful tokens.
 */
function scoreMatch(phantomSlug, liveSlug) {
  const pTokens = new Set(phantomSlug.split('-').filter(t => t.length > 2));
  const liveEntry = liveSlugTokens.find(e => e.slug === liveSlug);
  if (!liveEntry) return 0;
  const { tokens: lTokens } = liveEntry;

  let score = 0;
  for (const t of pTokens) {
    if (lTokens.has(t)) score++;
  }
  // Bonus: if live slug starts with same root (e.g. sap-, guidewire-)
  const pRoot = phantomSlug.split('-')[0];
  const lRoot = liveSlug.split('-')[0];
  if (pRoot === lRoot) score += 2;

  return score;
}

function findBestDestination(phantomSlug) {
  // 0. Manual override — highest priority
  if (MANUAL_OVERRIDES[phantomSlug]) return MANUAL_OVERRIDES[phantomSlug];

  // 1. Direct: if phantom is simply prefixed (best-, #1, etc.) try stripping
  const cleaned = phantomSlug
    .replace(/^best-/, '')
    .replace(/^no1-/, '')
    .replace(/-course-in-hyderabad$/, '-online-training')
    .replace(/-training-in-hyderabad$/, '-online-training')
    .replace(/-course$/, '-online-training');

  if (liveSlugSet.has(cleaned)) return `/${cleaned}/`;

  // 2. Token-similarity match (with stopword-filtered tokens)
  let bestSlug = null;
  let bestScore = 0;
  const pTokens = new Set(phantomSlug.split('-').filter(t => t.length > 2 && !STOPWORDS.has(t)));
  for (const { slug, tokens: lTokens } of liveSlugTokens) {
    let score = 0;
    for (const t of pTokens) if (lTokens.has(t)) score++;
    const pRoot = phantomSlug.split('-')[0];
    const lRoot = slug.split('-')[0];
    if (pRoot === lRoot) score += 3; // stronger root bonus
    if (score > bestScore) { bestScore = score; bestSlug = slug; }
  }
  if (bestScore >= 3 && bestSlug) return `/${bestSlug}/`;

  // 3. Category-family fallback using verified live slugs
  const CATEGORY_HUBS = {
    guidewire: '/guidewire-policycenter-online-training/',
    sap: '/sap-s-4-hana-fico-online-training/',
    oracle: '/oracle-fusion-financials-online-training/',
    salesforce: '/salesforce-revenue-cloud-advanced-training/',
    servicenow: '/servicenow-online-training/',
    workday: '/salesforce-online-training/',   // closest live "enterprise platform" hub
    sailpoint: '/salesforce-online-training/', // no sailpoint live — trending-courses hub
    snowflake: '/snowflake-online-training/',
    siemens: '/teamcenter-plm-training/',
    teamcenter: '/teamcenter-plm-training/',
    polarion: '/polarion-online-training/',
    dynamics: '/microsoft-dynamics-365-finance-and-operations/',
    devops: '/devops-with-aws-online-training/',
    coupa: '/coupa-online-training/',
    kinaxis: '/kinaxis-online-training-in-hyderabad/',
    palantir: '/palantir-foundry-online-training/',
  };

  for (const [keyword, dest] of Object.entries(CATEGORY_HUBS)) {
    if (phantomSlug.includes(keyword)) {
      // Verify dest is a live route
      const destSlug = dest.replace(/^\/|\/$/g, '');
      if (liveSlugSet.has(destSlug)) return dest;
    }
  }

  return '/courses/';
}

// ── Step 3: Load existing redirect rules ─────────────────────────────
const existingContent = fs.existsSync(REDIRECTS_PATH)
  ? fs.readFileSync(REDIRECTS_PATH, 'utf-8')
  : '';

// Parse existing rules into a Set of source paths (normalised)
const existingRules = new Set(
  existingContent.split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#'))
    .map(l => l.split(/\s+/)[0]) // just the source path
);

// ── Step 4: Process GSC map ────────────────────────────────────────────
const mapRows = parseCSV(MAP_CSV);
const newRules = []; // { source, dest, clicks }

const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'];

for (const row of mapRows) {
  const rawUrl = (row['URL (GSC / Live)'] || '').trim();
  if (!rawUrl.startsWith('http')) continue;
  if (IMAGE_EXTS.some(e => rawUrl.toLowerCase().endsWith(e))) continue;

  let urlPath;
  try { urlPath = new URL(rawUrl).pathname; } catch { continue; }

  const slug = urlPath.replace(/^\/|\/$/g, '');
  if (!slug) continue; // skip root

  // Skip if this is already a live active route
  if (isLiveRoute(slug)) continue;

  // Skip known archive patterns already handled
  const ARCHIVE_PREFIXES = ['category/', 'author/', 'tag/', 'home/', 'wp-'];
  if (ARCHIVE_PREFIXES.some(p => slug.startsWith(p))) continue;
  // Skip deep lesson paths (already redirected)
  if (slug.startsWith('courses/')) continue;
  if (slug.startsWith('events')) continue;
  if (slug.startsWith('blog')) continue;
  if (slug.startsWith('course-tag')) continue;

  const srcPath = `/${slug}/`;
  const srcNoSlash = `/${slug}`;
  if (existingRules.has(srcPath) || existingRules.has(srcNoSlash)) continue;

  const dest = findBestDestination(slug);
  const clicks = parseInt(row['Clicks (Last 12 Mo)'] || '0') || 0;

  newRules.push({ source: srcPath, dest, clicks, slug });
  // Also add non-trailing-slash variant
  newRules.push({ source: srcNoSlash, dest, clicks, slug: `${slug}(no-slash)` });
}

// ── Step 5: Sort by clicks (highest traffic first) and write ──────────
newRules.sort((a, b) => b.clicks - a.clicks);

const uniqueNewRules = [];
const seenSources = new Set(existingRules);
for (const rule of newRules) {
  if (!seenSources.has(rule.source)) {
    uniqueNewRules.push(rule);
    seenSources.add(rule.source);
  }
}

if (uniqueNewRules.length > 0) {
  const block = [
    '',
    '# Auto-generated GSC redirect rules (build-redirects.mjs)',
    ...uniqueNewRules.map(r => `${r.source} ${r.dest} 301`),
    '',
  ].join('\n');

  const updated = existingContent.trimEnd() + '\n' + block;
  fs.writeFileSync(REDIRECTS_PATH, updated);
}

console.log('\n═══════════════════════════════════════════');
console.log('         REDIRECT ARCHITECTURE REPORT');
console.log('═══════════════════════════════════════════');
console.log(`Live active routes:     ${liveSlugSet.size}`);
console.log(`GSC map rows:           ${mapRows.length}`);
console.log(`New redirect rules:     ${uniqueNewRules.filter(r => !r.slug.endsWith('(no-slash)')).length}`);
console.log(`Total rules in file:    ${seenSources.size}`);

// Show traffic-bearing redirects
const withClicks = uniqueNewRules.filter(r => r.clicks > 0 && !r.slug.endsWith('(no-slash)'));
if (withClicks.length > 0) {
  console.log('\n📊 Traffic-bearing redirects (clicks > 0):');
  withClicks.forEach(r => console.log(`   ${r.clicks} clicks | ${r.source} → ${r.dest}`));
}
console.log('\n✅ Redirect architecture complete.');
