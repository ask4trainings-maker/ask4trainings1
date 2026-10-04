import fs from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';

const DIST_DIR = path.join(process.cwd(), 'dist');

let errors = 0;
let audited = 0;

function assert(condition, message, file) {
  if (!condition) {
    console.error(`❌ [FAIL] ${file} - ${message}`);
    errors++;
  }
}

function verifySeo() {
  console.log('Running On-Page SEO Audit...');

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
    const relPath = file.replace(DIST_DIR, '').replace(/\\/g, '/');
    if (relPath.startsWith('/admin/')) return;
    
    audited++;
    const content = fs.readFileSync(file, 'utf8');
    const $ = cheerio.load(content);
    
    // 1. <h1> Count
    const h1Count = $('h1').length;
    assert(h1Count === 1, `Exactly 1 <h1> exists (found ${h1Count})`, relPath);

    // 2. Title Tag
    const titleText = $('title').text().trim();
    assert(titleText.length > 0, `Title tag is non-empty`, relPath);
    if (relPath !== '/404.html' && relPath !== '/404/') {
      // 130 chars limit for blog titles which are naturally long
      assert(titleText.length <= 130, `Title length is reasonable (${titleText.length} chars)`, relPath);
    }

    // 3. Meta Description
    const metaDesc = $('meta[name="description"]').attr('content');
    assert(!!metaDesc && metaDesc.trim().length > 0, `Meta description exists and is non-empty`, relPath);
    
    if (metaDesc && relPath !== '/404.html' && relPath !== '/404/') {
      assert(metaDesc.length >= 50 && metaDesc.length <= 165, `Meta description length (${metaDesc.length}) is between 50 and 165`, relPath);
    }

    // 4. Canonical Link
    const route = relPath.replace(/\/index\.html$/, '/') || '/';
    if (relPath !== '/404.html' && relPath !== '/404/') {
      const canonicalHref = $('link[rel="canonical"]').attr('href');
      assert(!!canonicalHref && canonicalHref.endsWith(route), `Canonical link exists and matches route (got ${canonicalHref}, expected ending in ${route})`, relPath);
    }

    // 5. OG Tags
    const ogTitle = $('meta[property="og:title"]').attr('content');
    const ogDesc = $('meta[property="og:description"]').attr('content');
    const ogImage = $('meta[property="og:image"]').attr('content');
    const ogUrl = $('meta[property="og:url"]').attr('content');
    
    assert(!!ogTitle, `og:title is present`, relPath);
    assert(!!ogDesc, `og:description is present`, relPath);
    assert(!!ogImage, `og:image is present`, relPath);
    assert(!!ogUrl, `og:url is present`, relPath);

    // 6. Twitter Card
    const twCard = $('meta[name="twitter:card"]').attr('content');
    assert(twCard === 'summary_large_image', `twitter:card is summary_large_image`, relPath);

    // 7. Image Alt Tags
    $('img').each((i, el) => {
      const alt = $(el).attr('alt');
      const src = $(el).attr('src');
      assert(typeof alt === 'string' && alt.length > 0, `Image missing alt attribute (src: ${src})`, relPath);
    });
  });

  console.log(`\nAudited ${audited} pages.`);
  
  if (errors > 0) {
    console.error(`❌ Verification failed with ${errors} errors.`);
    process.exit(1);
  } else {
    console.log(`✅ All checks passed successfully! On-Page SEO is hardened.`);
  }
}

verifySeo();
