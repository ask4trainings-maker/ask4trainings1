import fs from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';

const DIST_DIR = path.join(process.cwd(), 'dist');

let errors = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ [FAIL] ${message}`);
    errors++;
  }
}

function verifySeo() {
  console.log('Running SEO Schema Verification...');

  // 1. Robots.txt
  const robotsPath = path.join(DIST_DIR, 'robots.txt');
  assert(fs.existsSync(robotsPath), 'robots.txt exists in dist');
  if (fs.existsSync(robotsPath)) {
    const robotsText = fs.readFileSync(robotsPath, 'utf8');
    assert(robotsText.includes('Sitemap: https://ask4trainings.com/sitemap-index.xml'), 'robots.txt references sitemap-index.xml');
  }

  // 2. Sitemap
  const sitemapIndex = path.join(DIST_DIR, 'sitemap-index.xml');
  const sitemap0 = path.join(DIST_DIR, 'sitemap-0.xml');
  const hasSitemap = fs.existsSync(sitemapIndex) || fs.existsSync(sitemap0);
  assert(hasSitemap, 'sitemap-index.xml or sitemap-0.xml exists');

  // Parse all HTML files
  const htmlFiles = [];
  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      if (fs.statSync(fullPath).isDirectory()) {
        walk(fullPath);
      } else if (fullPath.endsWith('.html')) {
        htmlFiles.push(fullPath);
      }
    }
  }
  walk(DIST_DIR);

  htmlFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    const $ = cheerio.load(content);
    const relPath = file.replace(DIST_DIR, '').replace(/\\/g, '/'); // Normalize windows paths
    const route = relPath.replace(/\/index\.html$/, '/') || '/';

    // Canonical tag Check
    if (route !== '/404.html' && route !== '/404/' && !route.startsWith('/admin/')) {
      const canonicals = $('link[rel="canonical"]');
      assert(canonicals.length === 1, `HTML file ${relPath} contains exactly one canonical tag`);
      if (canonicals.length === 1) {
        const href = canonicals.attr('href');
        assert(href.endsWith(route), `Canonical tag matches route in ${relPath}: Expected ends with ${route}, got ${href}`);
        assert(href.startsWith('https://ask4trainings.com'), `Canonical is absolute URL with correct domain in ${relPath}`);
      }
    }

    // Extract JSON-LD scripts
    const schemas = [];
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const text = $(el).html() || '';
        schemas.push(JSON.parse(text));
      } catch(e) {
        assert(false, `Invalid JSON-LD syntax in ${relPath}`);
      }
    });

    const allSchemaTypes = new Set();
    schemas.forEach(s => {
      if (s['@graph']) {
        s['@graph'].forEach(g => allSchemaTypes.add(g['@type']));
      } else {
        const t = s['@type'];
        if (Array.isArray(t)) t.forEach(type => allSchemaTypes.add(type));
        else allSchemaTypes.add(t);
      }
    });

    // Homepage Check
    if (route === '/') {
      assert(allSchemaTypes.has('EducationalOrganization'), `Homepage contains EducationalOrganization schema`);
    }

    // Blog Check
    if (route.startsWith('/blog/') && route !== '/blog/') {
      assert(allSchemaTypes.has('BlogPosting'), `Blog post ${relPath} contains BlogPosting schema`);
    }

    // Course Check (assume course if it's not blog, not home, and not generic pages like contact/about, or just check by looking for Course layout markers if needed. 
    // Wait, the prompt says "Asserts that every course page contains valid JSON-LD with @type: "Course"". 
    // We can just check if all schemas found have the required types, but to avoid false negatives let's see if the page has `#curriculum` or similar to identify as a course page.
    if ($('#curriculum').length > 0) {
      assert(allSchemaTypes.has('Course'), `Course page ${relPath} contains Course schema`);
      
      // FAQ Check
      if ($('.faq-section').length > 0 || $('section:contains("FAQ")').length > 0) {
        assert(allSchemaTypes.has('FAQPage'), `Course page with FAQs ${relPath} contains FAQPage schema`);
      }
    }
  });

  if (errors > 0) {
    console.error(`❌ Verification failed with ${errors} errors.`);
    process.exit(1);
  } else {
    console.log(`✅ All ${htmlFiles.length} pages verified successfully! SEO Schema is healthy.`);
  }
}

verifySeo();
