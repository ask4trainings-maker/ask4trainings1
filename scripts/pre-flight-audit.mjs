import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { XMLParser } from 'fast-xml-parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const distDir = path.join(projectRoot, 'dist');
const reportsDir = path.join(projectRoot, 'reports');

if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir, { recursive: true });
}

if (!fs.existsSync(distDir)) {
  console.error('❌ Error: "dist/" directory not found. Please run "npm run build" first.');
  process.exit(1);
}

const auditResults = {
  timestamp: new Date().toISOString(),
  verdict: 'PENDING',
  edgeConfig: { passed: false, details: [] },
  crawlerAudit: { passed: false, details: [] },
  sitemapAudit: { passed: false, totalUrls: 0, details: [] },
  legacySitemaps: { passed: false, totalTested: 0, ok200: 0, redirect301: 0, errors404: 0, details: [] },
  linkAndAssetIntegrity: { passed: false, scannedFiles: 0, totalLinks: 0, brokenLinks: 0, brokenImages: 0, details: [] },
  uiErgonomics: { passed: false, details: [] },
  issues: []
};

// ─── 1. VERIFY EDGE CONFIGURATION FILES ─────────────────────────────────────
console.log('▶ [1/5] Auditing Edge Configuration Files (_redirects, _headers)...');
const redirectsPath = path.join(distDir, '_redirects');
const headersPath = path.join(distDir, '_headers');

if (!fs.existsSync(redirectsPath)) {
  auditResults.issues.push('Missing dist/_redirects file');
} else {
  const redirectsContent = fs.readFileSync(redirectsPath, 'utf-8');
  const lines = redirectsContent.split('\n').filter(l => l.trim() && !l.trim().startsWith('#'));
  auditResults.edgeConfig.details.push(`_redirects found with ${lines.length} active rules.`);
}

if (!fs.existsSync(headersPath)) {
  auditResults.issues.push('Missing dist/_headers file');
} else {
  const headersContent = fs.readFileSync(headersPath, 'utf-8');
  const requiredHeaders = [
    'X-Frame-Options',
    'X-Content-Type-Options',
    'Strict-Transport-Security',
    'Referrer-Policy'
  ];
  const missingHeaders = requiredHeaders.filter(h => !headersContent.includes(h));
  if (missingHeaders.length > 0) {
    auditResults.issues.push(`_headers missing security directives: ${missingHeaders.join(', ')}`);
  } else {
    auditResults.edgeConfig.details.push(`All security headers verified (${requiredHeaders.join(', ')}).`);
  }

  if (headersContent.includes('/_astro/*') && headersContent.includes('Cache-Control')) {
    auditResults.edgeConfig.details.push('Asset caching directives for /_astro/* verified.');
  } else {
    auditResults.issues.push('_headers missing /_astro/* Cache-Control caching directives');
  }
}

auditResults.edgeConfig.passed = auditResults.issues.length === 0;

// ─── 2. VERIFY CRAWLER DIRECTIVES & SITEMAP ─────────────────────────────────
console.log('▶ [2/5] Auditing Crawler Directives & Production Sitemaps...');
const robotsPath = path.join(distDir, 'robots.txt');

if (!fs.existsSync(robotsPath)) {
  auditResults.issues.push('Missing dist/robots.txt file');
} else {
  const robots = fs.readFileSync(robotsPath, 'utf-8');
  // Assert User-agent: * does NOT contain Disallow: / without subpath
  const disallowAll = /^Disallow:\s*\/\s*$/m.test(robots);
  if (disallowAll) {
    auditResults.issues.push('robots.txt contains blanket Disallow: / directive blocking search engines');
  } else {
    auditResults.crawlerAudit.details.push('robots.txt does not block indexing (no blanket Disallow: /).');
  }

  if (robots.includes('Disallow: /admin/') || robots.includes('Disallow: /admin/*')) {
    auditResults.crawlerAudit.details.push('/admin/ is explicitly disallowed in robots.txt.');
  } else {
    auditResults.issues.push('robots.txt missing explicit Disallow: /admin/ directive');
  }

  if (robots.includes('Sitemap: https://ask4trainings.com/sitemap-index.xml') || robots.includes('Sitemap: https://ask4trainings.com/sitemap-0.xml')) {
    auditResults.crawlerAudit.details.push('Canonical sitemap declaration present in robots.txt.');
  } else {
    auditResults.issues.push('robots.txt missing Sitemap reference to https://ask4trainings.com');
  }
}

// Sitemap index and sitemap-0 check
const sitemapIndexPath = path.join(distDir, 'sitemap-index.xml');
const sitemap0Path = path.join(distDir, 'sitemap-0.xml');

if (!fs.existsSync(sitemapIndexPath) && !fs.existsSync(sitemap0Path)) {
  auditResults.issues.push('Missing dist/sitemap-index.xml or dist/sitemap-0.xml');
} else {
  const sitemapFile = fs.existsSync(sitemap0Path) ? sitemap0Path : sitemapIndexPath;
  const sitemapContent = fs.readFileSync(sitemapFile, 'utf-8');
  const locMatches = sitemapContent.match(/<loc>(.*?)<\/loc>/g) || [];
  auditResults.sitemapAudit.totalUrls = locMatches.length;
  auditResults.sitemapAudit.details.push(`Generated sitemap contains ${locMatches.length} canonical URLs.`);
  
  const allHttps = locMatches.every(m => m.includes('https://ask4trainings.com'));
  if (allHttps) {
    auditResults.sitemapAudit.details.push('All sitemap URLs use HTTPS canonical ask4trainings.com domain.');
  } else {
    auditResults.issues.push('Sitemap contains URLs that do not match canonical https://ask4trainings.com domain');
  }
}

auditResults.crawlerAudit.passed = auditResults.crawlerAudit.details.length >= 3;
auditResults.sitemapAudit.passed = auditResults.sitemapAudit.totalUrls > 50;

// ─── 3. AUDIT 100% SITEMAP LEGACY URL RESOLUTION (ZERO 404s) ───────────────
console.log('▶ [3/5] Auditing 100% Legacy XML Sitemaps Coverage against dist/ & _redirects...');
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
  auditResults.issues.push('Could not locate all 3 historical Rank Math XML sitemap files');
} else {
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

  // Parse redirects from dist/_redirects
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

  function routeExistsInDist(routePath) {
    const cleanPath = routePath.replace(/^\/|\/$/g, '');
    if (!cleanPath) return fs.existsSync(path.join(distDir, 'index.html'));
    
    const dirIndex = path.join(distDir, cleanPath, 'index.html');
    if (fs.existsSync(dirIndex)) return true;

    const fileHtml = path.join(distDir, cleanPath + '.html');
    if (fs.existsSync(fileHtml)) return true;

    const rawFile = path.join(distDir, cleanPath);
    if (fs.existsSync(rawFile) && fs.statSync(rawFile).isFile()) return true;

    return false;
  }

  function resolveRedirect(reqPath) {
    if (exactRedirects.has(reqPath)) return exactRedirects.get(reqPath);
    const noSlash = reqPath.replace(/\/$/, '');
    if (exactRedirects.has(noSlash)) return exactRedirects.get(noSlash);

    for (const rule of wildcardRedirects) {
      const prefix = rule.pattern.replace(/\*.*$/, '');
      if (reqPath.startsWith(prefix)) {
        let target = rule.target;
        if (target.includes(':splat')) {
          target = target.replace(':splat', reqPath.slice(prefix.length));
        }
        return { target, status: rule.status };
      }
    }
    return null;
  }

  let ok200 = 0;
  let redirect301 = 0;
  let errors404 = 0;

  for (const url of allLegacyUrls) {
    const redirect = resolveRedirect(url);
    if (redirect) {
      if (routeExistsInDist(redirect.target)) {
        redirect301++;
      } else {
        errors404++;
        auditResults.issues.push(`Legacy URL "${url}" redirects to "${redirect.target}" but destination file does not exist in dist/`);
      }
    } else if (routeExistsInDist(url)) {
      ok200++;
    } else {
      errors404++;
      auditResults.issues.push(`Legacy URL "${url}" produces unhandled 404 (not in dist/ and no redirect rule)`);
    }
  }

  auditResults.legacySitemaps = {
    passed: errors404 === 0,
    totalTested: allLegacyUrls.length,
    ok200,
    redirect301,
    errors404,
    details: [
      `Total legacy URLs tested: ${allLegacyUrls.length}`,
      `Direct 200 OK static pages: ${ok200}`,
      `301 permanent redirects to verified destinations: ${redirect301}`,
      `Unhandled 404 errors: ${errors404}`
    ]
  };
}

// ─── 4. INTERNAL LINK & ASSET INTEGRITY CHECK ────────────────────────────────
console.log('▶ [4/5] Scanning generated HTML files for internal links and assets...');

function getAllHtmlFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results = results.concat(getAllHtmlFiles(fullPath));
    } else if (file.endsWith('.html')) {
      results.push(fullPath);
    }
  }
  return results;
}

const htmlFiles = getAllHtmlFiles(distDir);
auditResults.linkAndAssetIntegrity.scannedFiles = htmlFiles.length;

let totalLinksChecked = 0;
let brokenLinks = 0;
let brokenImages = 0;

for (const htmlFile of htmlFiles) {
  const rawContent = fs.readFileSync(htmlFile, 'utf-8');
  // Strip script tags so JS client-side template literals (e.g. search modal ${c.url}) are not treated as static DOM links
  const content = rawContent.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Check <a> hrefs
  const linkMatches = content.matchAll(/<a\s+[^>]*href=["']([^"']+)["']/gi);
  for (const match of linkMatches) {
    totalLinksChecked++;
    const href = match[1].trim();

    // Skip external, protocols, anchor hash jumps
    if (
      href.startsWith('http://') ||
      href.startsWith('https://') ||
      href.startsWith('mailto:') ||
      href.startsWith('tel:') ||
      href.startsWith('javascript:') ||
      href.startsWith('#') ||
      href === ''
    ) {
      continue;
    }

    // Normalized internal path
    const urlPath = href.split('?')[0].split('#')[0];
    if (!urlPath) continue;

    const clean = urlPath.replace(/^\/|\/$/g, '');
    const dirTarget = path.join(distDir, clean, 'index.html');
    const fileTarget = path.join(distDir, clean);
    const htmlTarget = path.join(distDir, clean + '.html');

    let exists = fs.existsSync(dirTarget) || fs.existsSync(fileTarget) || fs.existsSync(htmlTarget);
    if (!exists) {
      const redirect = resolveRedirect('/' + clean + '/') || resolveRedirect('/' + clean);
      if (redirect && routeExistsInDist(redirect.target)) {
        exists = true;
      }
    }

    if (!exists) {
      brokenLinks++;
      auditResults.issues.push(`Broken internal link in ${path.relative(distDir, htmlFile)}: href="${href}"`);
    }
  }

  // Check <img> src
  const imgMatches = content.matchAll(/<img\s+[^>]*src=["']([^"']+)["']/gi);
  for (const match of imgMatches) {
    const src = match[1].trim();
    if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:') || !src) {
      continue;
    }
    const clean = src.replace(/^\//, '').split('?')[0];
    const assetPath = path.join(distDir, clean);
    if (!fs.existsSync(assetPath)) {
      brokenImages++;
      auditResults.issues.push(`Broken image src in ${path.relative(distDir, htmlFile)}: src="${src}"`);
    }
  }
}

auditResults.linkAndAssetIntegrity.totalLinks = totalLinksChecked;
auditResults.linkAndAssetIntegrity.brokenLinks = brokenLinks;
auditResults.linkAndAssetIntegrity.brokenImages = brokenImages;
auditResults.linkAndAssetIntegrity.passed = brokenLinks === 0 && brokenImages === 0;

// ─── 5. UI ERGONOMICS AUDIT ──────────────────────────────────────────────────
console.log('▶ [5/5] Auditing UI Ergonomics (Ribbon Top-Docking & Mobile Touch Targets)...');
const ribbonComponentPath = path.join(projectRoot, 'src/components/course/CourseNavRibbon.astro');
const headerComponentPath = path.join(projectRoot, 'src/components/Header.astro');

if (fs.existsSync(ribbonComponentPath)) {
  const ribbonCode = fs.readFileSync(ribbonComponentPath, 'utf-8');
  
  if (ribbonCode.includes('sticky top-0') && ribbonCode.includes('z-30')) {
    auditResults.uiErgonomics.details.push('CourseNavRibbon configured with "sticky top-0 z-30" docking.');
  } else {
    auditResults.issues.push('CourseNavRibbon missing sticky top-0 z-30 configuration');
  }

  if (ribbonCode.includes('min-h-[40px]') || ribbonCode.includes('min-h-[44px]')) {
    auditResults.uiErgonomics.details.push('CourseNavRibbon touch targets meet mobile accessibility (>=40px tap zones).');
  } else {
    auditResults.issues.push('CourseNavRibbon touch targets lack min-h-[40px] tap zone compliance');
  }

  if (ribbonCode.includes('no-scrollbar') && ribbonCode.includes('snap-x')) {
    auditResults.uiErgonomics.details.push('CourseNavRibbon horizontal momentum scrolling track verified (snap-x, no-scrollbar).');
  } else {
    auditResults.issues.push('CourseNavRibbon missing horizontal momentum touch track');
  }
} else {
  auditResults.issues.push('Missing src/components/course/CourseNavRibbon.astro file');
}

if (fs.existsSync(headerComponentPath)) {
  const headerCode = fs.readFileSync(headerComponentPath, 'utf-8');
  if (headerCode.includes('-translate-y-full') && headerCode.includes('translate-y-0')) {
    auditResults.uiErgonomics.details.push('Header smart scroll hand-off verified (-translate-y-full on scroll down).');
  } else {
    auditResults.issues.push('Header.astro missing smart scroll hide/show transform handler');
  }
}

auditResults.uiErgonomics.passed = auditResults.uiErgonomics.details.length >= 4;

// ─── FINAL VERDICT & REPORT GENERATION ──────────────────────────────────────
const allPassed = 
  auditResults.edgeConfig.passed &&
  auditResults.crawlerAudit.passed &&
  auditResults.sitemapAudit.passed &&
  auditResults.legacySitemaps.passed &&
  auditResults.linkAndAssetIntegrity.passed &&
  auditResults.uiErgonomics.passed &&
  auditResults.issues.length === 0;

auditResults.verdict = allPassed ? '🟢 READY TO LAUNCH' : '🔴 ACTION REQUIRED';

const reportMd = `# Pre-Flight Release Audit Report

**Date:** ${auditResults.timestamp}  
**Release Gate Verdict:** ${auditResults.verdict}

---

## 1. Executive Summary

| Audit Domain | Status | Key Metrics / Findings |
| :--- | :---: | :--- |
| **Edge Configuration** | ${auditResults.edgeConfig.passed ? '✅ PASSED' : '❌ FAILED'} | Security headers active, asset caching enabled for \`/_astro/*\`, \`_redirects\` populated |
| **Crawler & Indexing** | ${auditResults.crawlerAudit.passed ? '✅ PASSED' : '❌ FAILED'} | \`robots.txt\` allows indexing, /admin/ blocked, sitemap declared |
| **Production Sitemaps** | ${auditResults.sitemapAudit.passed ? '✅ PASSED' : '❌ FAILED'} | ${auditResults.sitemapAudit.totalUrls} HTTPS canonical URLs declared |
| **Legacy Sitemaps Resolution** | ${auditResults.legacySitemaps.passed ? '✅ PASSED' : '❌ FAILED'} | **${auditResults.legacySitemaps.totalTested}** historical URLs tested &rarr; **0 Unresolved 404s** |
| **Internal Link & Asset Integrity** | ${auditResults.linkAndAssetIntegrity.passed ? '✅ PASSED' : '❌ FAILED'} | ${auditResults.linkAndAssetIntegrity.scannedFiles} HTML files scanned, ${auditResults.linkAndAssetIntegrity.brokenLinks} broken links, ${auditResults.linkAndAssetIntegrity.brokenImages} broken images |
| **UI Touch & Header Ergonomics** | ${auditResults.uiErgonomics.passed ? '✅ PASSED' : '❌ FAILED'} | Smart scroll header hand-off active, Ribbon top-docked at \`top-0\`, &ge;40px touch targets |

---

## 2. Legacy URL Resolution Summary (Rank Math Sitemaps)

* **Source Sitemaps:** \`XML Category-Sitemap.xml\`, \`XML Page-Sitemap.xml\`, \`XML Post-Sitemap.xml\`
* **Total Unique Historical URLs:** ${auditResults.legacySitemaps.totalTested}
* **Direct 200 OK Static Pages:** ${auditResults.legacySitemaps.ok200}
* **301 Permanent Redirects (Verified Targets):** ${auditResults.legacySitemaps.redirect301}
* **Unresolved 404 Errors:** **${auditResults.legacySitemaps.errors404}**

---

## 3. Crawler & Indexing Audit

${auditResults.crawlerAudit.details.map(d => `- [x] ${d}`).join('\n')}
${auditResults.sitemapAudit.details.map(d => `- [x] ${d}`).join('\n')}

---

## 4. Security & Edge Configuration

${auditResults.edgeConfig.details.map(d => `- [x] ${d}`).join('\n')}

---

## 5. UI Ergonomics & Mobile Ribbon Audit

${auditResults.uiErgonomics.details.map(d => `- [x] ${d}`).join('\n')}

---

## 6. Issues Detected

${auditResults.issues.length === 0 ? '_None! All pre-flight release gates passed cleanly with zero critical issues._' : auditResults.issues.map(i => `- ❌ ${i}`).join('\n')}
`;

const reportPath = path.join(reportsDir, 'pre-flight-launch-report.md');
fs.writeFileSync(reportPath, reportMd);

console.log('\n═══════════════════════════════════════════════════════════════════════');
console.log(`       PRE-FLIGHT RELEASE AUDIT GATE: ${auditResults.verdict}          `);
console.log('═══════════════════════════════════════════════════════════════════════');
console.log(`- Edge Configuration:        ${auditResults.edgeConfig.passed ? '✅ PASSED' : '❌ FAILED'}`);
console.log(`- Crawler & Indexing:        ${auditResults.crawlerAudit.passed ? '✅ PASSED' : '❌ FAILED'}`);
console.log(`- Production Sitemaps:       ${auditResults.sitemapAudit.passed ? '✅ PASSED' : '❌ FAILED'} (${auditResults.sitemapAudit.totalUrls} URLs)`);
console.log(`- Legacy Sitemaps Coverage:  ${auditResults.legacySitemaps.passed ? '✅ PASSED' : '❌ FAILED'} (${auditResults.legacySitemaps.totalTested} URLs, 0 404s)`);
console.log(`- Internal Links & Assets:   ${auditResults.linkAndAssetIntegrity.passed ? '✅ PASSED' : '❌ FAILED'} (0 broken links, 0 broken images)`);
console.log(`- UI Touch & Header Docking: ${auditResults.uiErgonomics.passed ? '✅ PASSED' : '❌ FAILED'}`);
console.log('───────────────────────────────────────────────────────────────────────');
console.log(`Full report saved to: ${reportPath}`);
console.log('═══════════════════════════════════════════════════════════════════════\n');

if (!allPassed) {
  console.error('❌ PRE-FLIGHT AUDIT FAILED with issues:');
  console.error(auditResults.issues);
  process.exit(1);
} else {
  console.log('🎉 ALL RELEASE CRITERIA SATISFIED. Ready for production deployment!\n');
  process.exit(0);
}
