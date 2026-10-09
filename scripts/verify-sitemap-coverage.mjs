import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { XMLParser } from 'fast-xml-parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const distDir = path.join(projectRoot, 'dist');

if (!fs.existsSync(distDir)) {
  console.error('Error: "dist/" directory not found. Please run "npm run build" first.');
  process.exit(1);
}

// 1. Ingest Sitemaps
const candidateDirs = [
  path.join(projectRoot, 'scripts/migration/sitemaps'),
  path.join(projectRoot, 'docs'),
  projectRoot
];

let sitemapDir = candidateDirs.find(dir => 
  fs.existsSync(path.join(dir, 'XML Category-Sitemap.xml')) &&
  fs.existsSync(path.join(dir, 'XML Page-Sitemap.xml')) &&
  fs.existsSync(path.join(dir, 'XML Post-Sitemap.xml'))
);

if (!sitemapDir) {
  console.error('Could not locate all 3 sitemap XML files.');
  process.exit(1);
}

const parser = new XMLParser({ ignoreAttributes: false });

function extractLocs(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const parsed = parser.parse(content);
  const rawUrls = parsed.urlset?.url || [];
  const list = Array.isArray(rawUrls) ? rawUrls : [rawUrls];
  return list.map(item => {
    let loc = typeof item === 'string' ? item : item.loc;
    loc = loc.trim().replace(/^https?:\/\/[^\/]+/, '');
    if (!loc.startsWith('/')) loc = '/' + loc;
    if (!loc.endsWith('/') && !path.extname(loc)) loc = loc + '/';
    return loc;
  });
}

const catUrls = extractLocs(path.join(sitemapDir, 'XML Category-Sitemap.xml'));
const pageUrls = extractLocs(path.join(sitemapDir, 'XML Page-Sitemap.xml'));
const postUrls = extractLocs(path.join(sitemapDir, 'XML Post-Sitemap.xml'));

const allLegacyUrls = [...new Set([...catUrls, ...pageUrls, ...postUrls])].sort();

// 2. Parse _redirects rules
const redirectsPath = fs.existsSync(path.join(distDir, '_redirects'))
  ? path.join(distDir, '_redirects')
  : path.join(projectRoot, 'public/_redirects');

const redirectsContent = fs.readFileSync(redirectsPath, 'utf-8');
const exactRedirects = new Map();
const wildcardRedirects = [];

for (const line of redirectsContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const parts = trimmed.split(/\s+/);
  if (parts.length >= 2) {
    const src = parts[0];
    const dst = parts[1];
    const status = parseInt(parts[2] || '301', 10);
    if (src.includes('*')) {
      wildcardRedirects.push({ pattern: src, target: dst, status });
    } else {
      exactRedirects.set(src, { target: dst, status });
    }
  }
}

// 3. Helper to verify if route exists in dist/
function routeExistsInDist(routePath) {
  const cleanPath = routePath.replace(/^\/|\/$/g, '');
  if (!cleanPath) {
    return fs.existsSync(path.join(distDir, 'index.html'));
  }
  
  // Try directory format: dist/<path>/index.html
  const dirPath = path.join(distDir, cleanPath, 'index.html');
  if (fs.existsSync(dirPath)) return true;

  // Try file format: dist/<path>.html or dist/<path>
  const filePath = path.join(distDir, cleanPath + '.html');
  if (fs.existsSync(filePath)) return true;

  const rawPath = path.join(distDir, cleanPath);
  if (fs.existsSync(rawPath) && fs.statSync(rawPath).isFile()) return true;

  return false;
}

// Helper to resolve redirect match
function resolveRedirect(reqPath) {
  // Check exact with trailing slash
  if (exactRedirects.has(reqPath)) {
    return exactRedirects.get(reqPath);
  }
  // Check exact without trailing slash
  const noSlash = reqPath.replace(/\/$/, '');
  if (exactRedirects.has(noSlash)) {
    return exactRedirects.get(noSlash);
  }

  // Check wildcards in order
  for (const rule of wildcardRedirects) {
    const prefix = rule.pattern.replace(/\*.*$/, '');
    if (reqPath.startsWith(prefix)) {
      let target = rule.target;
      if (target.includes(':splat')) {
        const rest = reqPath.slice(prefix.length);
        target = target.replace(':splat', rest);
      }
      return { target, status: rule.status };
    }
  }

  return null;
}

// 4. Evaluate each legacy URL
const results = {
  ok200: [],
  redirect301: [],
  errors404: []
};

for (const url of allLegacyUrls) {
  const redirect = resolveRedirect(url);
  if (redirect) {
    const destExists = routeExistsInDist(redirect.target);
    if (destExists) {
      results.redirect301.push({
        url,
        status: redirect.status,
        target: redirect.target
      });
    } else {
      results.errors404.push({
        url,
        type: 'BROKEN_REDIRECT_TARGET',
        target: redirect.target
      });
    }
  } else if (routeExistsInDist(url)) {
    results.ok200.push({
      url,
      status: 200
    });
  } else {
    results.errors404.push({
      url,
      type: 'UNHANDLED_404',
      target: null
    });
  }
}

// 5. Output Summary Table & Assertion Gate
console.log('═══════════════════════════════════════════════════════════════════════');
console.log('       AUTOMATED SITEMAP 404 COVERAGE & VERIFICATION REPORT            ');
console.log('═══════════════════════════════════════════════════════════════════════');
console.log(`Source Sitemaps:       ${sitemapDir}`);
console.log(`Build Output:          ${distDir}`);
console.log(`_redirects Rules:      ${exactRedirects.size} exact, ${wildcardRedirects.length} wildcard`);
console.log('───────────────────────────────────────────────────────────────────────');
console.log(`Total Unique Legacy URLs Tested:  ${allLegacyUrls.length}`);
console.log(`  - 200 OK (Direct Static Pages): ${results.ok200.length}`);
console.log(`  - 301 Redirects (Valid Target): ${results.redirect301.length}`);
console.log(`  - 404 Errors / Broken Targets:  ${results.errors404.length}`);
console.log('═══════════════════════════════════════════════════════════════════════');

if (results.errors404.length > 0) {
  console.error('\n❌ FAILURE: Detected unhandled legacy URLs or broken redirects:');
  console.table(results.errors404);
  process.exit(1);
} else {
  console.log('\n✅ SUCCESS: 100% Sitemap Coverage Verified! ZERO 404s detected.');
  process.exit(0);
}
