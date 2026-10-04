import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as cheerio from 'cheerio';

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
      let src = parts[0];
      if (!src.endsWith('/')) src = src + '/';
      redirectSources.add(src);
      redirectSources.add(parts[0]); 
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

// ── Verification State ───────────────────────────────────────────────
const SKIP_PATTERNS = [
  '/_astro/',  
  '/assets/', '/pagefind/', '/_pagefind/', '/admin',
  '/sitemap', '/robots.txt', '/favicon', '/.well-known', '/fonts/',
];

let hasErrors = false;
let verifiedLinks = 0;
let brokenLinks = 0;
let conversionLinksChecked = 0;
let inArticleTokensChecked = 0;

function isExternalLink(href) {
  return href.startsWith('http://') || 
         href.startsWith('https://') || 
         href.startsWith('//');
}

function verifyInternalPath(urlPath, htmlFile) {
  let [pathWithQuery, hash] = urlPath.split('#');
  let [pathname] = pathWithQuery.split('?');
  
  // If it's just a hash on the same page
  if (!pathname && hash) {
    const $ = cheerio.load(fs.readFileSync(htmlFile, 'utf-8'));
    if ($(`#${hash}`).length === 0) {
      return { status: 'broken', reason: `Hash #${hash} not found in same file` };
    }
    return { status: 'ok' };
  }

  let normalised = pathname;
  if (!normalised.endsWith('/')) normalised = normalised + '/';

  if (redirectSources.has(normalised) || redirectSources.has(pathname)) return { status: 'redirect' };

  let candidate = path.join(DIST, normalised, 'index.html');
  if (fs.existsSync(candidate)) {
    if (hash) {
      const targetHtml = fs.readFileSync(candidate, 'utf-8');
      const $ = cheerio.load(targetHtml);
      if ($(`#${hash}`).length === 0) {
        return { status: 'broken', reason: `Hash #${hash} not found in ${normalised}` };
      }
    }
    return { status: 'ok' };
  }

  const directHtml = path.join(DIST, pathname.replace(/\/$/, '') + '.html');
  if (fs.existsSync(directHtml)) {
    if (hash) {
      const targetHtml = fs.readFileSync(directHtml, 'utf-8');
      const $ = cheerio.load(targetHtml);
      if ($(`#${hash}`).length === 0) {
        return { status: 'broken', reason: `Hash #${hash} not found in ${pathname}` };
      }
    }
    return { status: 'ok' };
  }

  if (pathname === '/' || normalised === '/') {
    const rootHtml = path.join(DIST, 'index.html');
    if (fs.existsSync(rootHtml)) {
      if (hash) {
        const targetHtml = fs.readFileSync(rootHtml, 'utf-8');
        const $ = cheerio.load(targetHtml);
        if ($(`#${hash}`).length === 0) {
          return { status: 'broken', reason: `Hash #${hash} not found in root` };
        }
      }
      return { status: 'ok' };
    }
  }

  return { status: 'broken', reason: 'File not found' };
}

for (const htmlFile of htmlFiles) {
  const relativePage = path.relative(DIST, htmlFile);
  const html = fs.readFileSync(htmlFile, 'utf-8');
  const $ = cheerio.load(html);

  // 1. Audit Links
  $('a').each((i, el) => {
    const href = $(el).attr('href');
    if (!href || href === '/') { verifiedLinks++; return; }

    // Conversion endpoints check
    if (href.startsWith('https://wa.me/')) {
      conversionLinksChecked++;
      const url = new URL(href);
      const target = $(el).attr('target');
      const rel = $(el).attr('rel') || '';
      
      if (target !== '_blank') {
        console.error(`❌ [WhatsApp] Missing target="_blank" in ${relativePage}`);
        hasErrors = true;
      }
      if (!rel.includes('noopener') || !rel.includes('noreferrer')) {
        console.error(`❌ [WhatsApp] Missing rel="noopener noreferrer" in ${relativePage}`);
        console.error(`HTML: ${$.html(el)}`);
        hasErrors = true;
      }
      // Check encoding of text query param
      const textParam = url.searchParams.get('text');
      if (textParam) {
        const encodedText = encodeURIComponent(textParam);
        const rawHref = href.split('text=')[1];
        if (rawHref && rawHref.includes(' ')) {
           console.error(`❌ [WhatsApp] Unencoded space in ?text= parameter: ${href} in ${relativePage}`);
           hasErrors = true;
        }
      }
    } else if (href.startsWith('tel:')) {
      conversionLinksChecked++;
      if (href !== 'tel:+918099949888') {
         console.warn(`⚠️ [Phone] Non-standard phone link: ${href} in ${relativePage}`);
      }
    } else if (href.startsWith('mailto:')) {
      conversionLinksChecked++;
      if (href !== 'mailto:ask4trainings@gmail.com') {
         console.warn(`⚠️ [Email] Non-standard email link: ${href} in ${relativePage}`);
      }
    }

    if (isExternalLink(href)) { return; }
    if (SKIP_PATTERNS.some(p => href.startsWith(p))) { return; }
    if (href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) { return; }

    const result = verifyInternalPath(href, htmlFile);
    if (result.status === 'ok') { 
      verifiedLinks++; 
    } else if (result.status === 'redirect') { 
      // ok
    } else {
      brokenLinks++;
      hasErrors = true;
      console.error(`❌ [Broken Link] ${href} in ${relativePage} (${result.reason})`);
    }
  });

  // 2. Blog token verification
  if (relativePage.includes('blog/')) {
    inArticleTokensChecked++;
    if (html.includes('::enroll-now')) {
      console.error(`❌ [Token] Unparsed ::enroll-now token found in ${relativePage}`);
      hasErrors = true;
    }
    if (html.includes('::whatsapp-us')) {
      console.error(`❌ [Token] Unparsed ::whatsapp-us token found in ${relativePage}`);
      hasErrors = true;
    }
  }
}

console.log('═══════════════════════════════════════════');
console.log('       QA FUNCTIONAL AUDIT REPORT');
console.log('═══════════════════════════════════════════');
if (hasErrors) {
  console.log('❌ Audit FAILED with errors.');
  process.exit(1);
} else {
  console.log(`✅ [PASS] Conversion Links Verified: ${conversionLinksChecked}`);
  console.log(`✅ [PASS] Internal Navigation & Anchor Targets Verified: ${verifiedLinks} ok, ${brokenLinks} broken`);
  console.log(`✅ [PASS] In-Article Markdown Tokens Parsed: ${inArticleTokensChecked} pages`);
  console.log('✅ Audit PASSED.');
  process.exit(0);
}
