/**
 * scripts/audit-internal-links.mjs
 * ────────────────────────────────────────────────────────────────────
 * Post-build Internal Link Audit Gate
 *
 * Parses every emitted HTML file in dist/, scrapes all <a href="..."> tags,
 * verifies that every internal link either:
 *   (a) Has a corresponding dist/<path>/index.html, or
 *   (b) Matches a redirect rule in public/_redirects
 *
 * Exits with code 1 and reports broken links if any are found.
 *
 * Usage: node scripts/audit-internal-links.mjs
 * Registered in package.json build pipeline.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const REDIRECTS_PATH = path.join(ROOT, 'public', '_redirects');

// ── Guard: dist must exist ───────────────────────────────────────────
if (!fs.existsSync(DIST)) {
  console.error('❌ dist/ directory not found. Run astro build first.');
  process.exit(1);
}

// ── Step 1: Load redirect rules from public/_redirects ───────────────
const redirectSources = new Set();
if (fs.existsSync(REDIRECTS_PATH)) {
  const lines = fs.readFileSync(REDIRECTS_PATH, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const parts = trimmed.split(/\s+/);
    if (parts.length >= 2) {
      // Normalise source: always with trailing slash
      let src = parts[0];
      if (!src.endsWith('/')) src = src + '/';
      redirectSources.add(src);
      redirectSources.add(parts[0]); // also add as-is
    }
  }
}

// ── Step 2: Collect all built HTML files ─────────────────────────────
function walkHtml(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkHtml(full, files);
    else if (entry.name.endsWith('.html')) files.push(full);
  }
  return files;
}

const htmlFiles = walkHtml(DIST);
console.log(`\n🔍 Auditing ${htmlFiles.length} HTML files in dist/…\n`);

// ── Step 3: Parse href attributes from HTML ───────────────────────────
// Simple regex-based extraction — no DOM parser needed for static HTML
function extractHrefs(html) {
  const hrefs = [];
  // Match href="..." or href='...'
  const re = /href=["']([^"'#?]+)["']/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    hrefs.push(m[1]);
  }
  return hrefs;
}

// ── Step 4: Resolve and verify each internal link ────────────────────
function isExternalLink(href) {
  return href.startsWith('http://') || href.startsWith('https://') ||
         href.startsWith('mailto:') || href.startsWith('tel:') ||
         href.startsWith('//');
}

function verifyInternalPath(urlPath) {
  // Normalise: ensure trailing slash
  let normalised = urlPath;
  if (!normalised.endsWith('/')) normalised = normalised + '/';

  // Check redirect rules first (covers orphan → redirect chains)
  if (redirectSources.has(normalised) || redirectSources.has(urlPath)) return 'redirect';

  // Check for index.html in dist
  const candidate = path.join(DIST, normalised, 'index.html');
  if (fs.existsSync(candidate)) return 'ok';

  // Also check without trailing slash (e.g. dist/courses.html)
  const directHtml = path.join(DIST, urlPath.replace(/\/$/, '') + '.html');
  if (fs.existsSync(directHtml)) return 'ok';

  // Root
  if (urlPath === '/' || normalised === '/') {
    const rootHtml = path.join(DIST, 'index.html');
    if (fs.existsSync(rootHtml)) return 'ok';
  }

  return 'broken';
}

// Known external-but-same-domain links to skip (handled by Cloudflare/CDN)
const SKIP_PATTERNS = [
  '/_astro/',  // Hashed Astro build assets (CSS/JS bundles)
  '/assets/', '/pagefind/', '/_pagefind/', '/admin',
  '/sitemap', '/robots.txt', '/favicon', '/.well-known', '/fonts/',
];

const broken = []; // { source, href }
const stats = { ok: 0, redirect: 0, external: 0, skipped: 0, broken: 0 };

for (const htmlFile of htmlFiles) {
  const relativePage = path.relative(DIST, htmlFile);
  const html = fs.readFileSync(htmlFile, 'utf-8');
  const hrefs = extractHrefs(html);

  for (const href of hrefs) {
    if (!href || href === '/') { stats.ok++; continue; }

    if (isExternalLink(href)) { stats.external++; continue; }

    // Skip asset/system paths
    if (SKIP_PATTERNS.some(p => href.startsWith(p))) { stats.skipped++; continue; }

    // Only audit absolute paths (internal)
    if (!href.startsWith('/')) { stats.skipped++; continue; }

    const result = verifyInternalPath(href);
    if (result === 'ok') { stats.ok++; }
    else if (result === 'redirect') { stats.redirect++; }
    else {
      stats.broken++;
      broken.push({ source: relativePage, href });
    }
  }
}

// ── Report ────────────────────────────────────────────────────────────
console.log('═══════════════════════════════════════════');
console.log('       INTERNAL LINK AUDIT REPORT');
console.log('═══════════════════════════════════════════');
console.log(`HTML files scanned:   ${htmlFiles.length}`);
console.log(`OK links:             ${stats.ok}`);
console.log(`Redirect links:       ${stats.redirect}`);
console.log(`External links:       ${stats.external}`);
console.log(`Skipped (assets):     ${stats.skipped}`);
console.log(`Broken links:         ${stats.broken}`);

if (broken.length > 0) {
  console.log('\n❌ BROKEN INTERNAL LINKS:');

  // Deduplicate by href
  const unique = new Map();
  for (const b of broken) {
    if (!unique.has(b.href)) unique.set(b.href, []);
    unique.get(b.href).push(b.source);
  }

  for (const [href, sources] of [...unique.entries()].sort()) {
    console.log(`\n  🔗 ${href}`);
    const limited = sources.slice(0, 3);
    limited.forEach(s => console.log(`       found in: ${s}`));
    if (sources.length > 3) console.log(`       … and ${sources.length - 3} more pages`);
  }

  console.log('\n❌ Link audit FAILED. Fix broken links before deploying.\n');
  process.exit(1);
} else {
  console.log('\n✅ All internal links are valid. Audit PASSED.\n');
  process.exit(0);
}
