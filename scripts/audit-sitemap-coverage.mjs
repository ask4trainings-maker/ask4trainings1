import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { XMLParser } from 'fast-xml-parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Find sitemaps directory
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

const categorySitemapUrls = extractLocs(path.join(sitemapDir, 'XML Category-Sitemap.xml'));
const pageSitemapUrls = extractLocs(path.join(sitemapDir, 'XML Page-Sitemap.xml'));
const postSitemapUrls = extractLocs(path.join(sitemapDir, 'XML Post-Sitemap.xml'));

// Read blog slugs
const blogDir = path.join(projectRoot, 'src/content/blog');
const blogSlugs = new Set(
  fs.readdirSync(blogDir)
    .filter(f => f.endsWith('.md') || f.endsWith('.mdx'))
    .map(f => f.replace(/\.mdx?$/, ''))
);

// Read course slugs
const courseDir = path.join(projectRoot, 'src/content/courses');
const courseSlugs = new Set(
  fs.readdirSync(courseDir)
    .filter(f => f.endsWith('.md') || f.endsWith('.mdx'))
    .map(f => f.replace(/\.mdx?$/, ''))
);

// Read categories configuration
const categoriesData = JSON.parse(
  fs.readFileSync(path.join(projectRoot, 'src/content/categories.json'), 'utf-8')
);

// Domain Category Hub Slugs
const categoryHubMap = {
  '/guidewire-courses/': { categoryKey: 'guidewire', label: 'Guidewire' },
  '/siemens-courses/': { categoryKey: 'siemens', label: 'Siemens' },
  '/new-courses/': { categoryKey: 'new-courses', label: 'New Courses' },
  '/cloud-computing/': { categoryKey: 'cloud-computing', label: 'Cloud Computing' },
  '/oracle-courses/': { categoryKey: 'oracle', label: 'Oracle' },
  '/devops-courses/': { categoryKey: 'devops', label: 'DevOps' },
  '/development-courses/': { categoryKey: 'development', label: 'Development' },
  '/microsoft-dynamics-365-courses/': { categoryKey: 'ms-d365', label: 'MS D365' },
  '/sap-courses/': { categoryKey: 'sap', label: 'SAP' },
  '/trending-courses/': { categoryKey: 'trending-courses', label: 'Trending Courses' },
  '/other-tools-courses/': { categoryKey: 'other-tools', label: 'Other Tools' }
};

// Taxonomy category archives mapping
const taxonomyMap = {
  '/category/uncategorized/': '/blog/',
  '/category/guidewire-development/': '/guidewire-courses/',
  '/category/guidewire/': '/guidewire-courses/',
  '/category/kinaxis/': '/new-courses/',
  '/category/polarion/': '/siemens-courses/',
  '/category/guidewire-testing/': '/guidewire-courses/',
  '/category/guidewire-frameworks/': '/guidewire-courses/',
  '/category/data-analyst/': '/trending-courses/',
  '/category/teamcenter/': '/siemens-courses/'
};

// Mismatched / legacy page redirect mappings
const legacyPageOverrides = {
  '/guidewire-policycenter-training/': '/guidewire-policycenter-online-training/',
  '/workday-training-in-hyderabad/': '/other-tools-courses/',
  '/mulesoft-training-in-hyderabad/': '/development-courses/'
};

const buckets = {
  bucketA_categoryHubs: [],
  bucketB_blogPosts: [],
  bucketC_taxonomyArchives: [],
  bucketD_directMatches: [],
  bucketE_pageRedirects: []
};

// 1. Process Category Sitemap
for (const url of categorySitemapUrls) {
  const target = taxonomyMap[url] || '/courses/';
  buckets.bucketC_taxonomyArchives.push({
    source: url,
    target,
    statusCode: 301,
    reason: 'WordPress category archive taxonomy mapped to modern category hub or blog'
  });
}

// 2. Process Post Sitemap
for (const url of postSitemapUrls) {
  if (url === '/blog/') {
    buckets.bucketD_directMatches.push({
      url,
      type: 'blog_index',
      statusCode: 200
    });
    continue;
  }
  
  const slug = url.replace(/^\/|\/$/g, '');
  
  // Special case: if a course exists with this slug, course takes precedence for 200 OK
  if (courseSlugs.has(slug)) {
    buckets.bucketD_directMatches.push({
      url,
      type: 'course_exact',
      statusCode: 200,
      note: `Dual presence: also exists as article in /blog/${slug}/`
    });
  } else if (blogSlugs.has(slug)) {
    buckets.bucketB_blogPosts.push({
      source: url,
      target: `/blog/${slug}/`,
      statusCode: 301,
      reason: 'Legacy root-level WordPress blog post relocated to /blog/[slug]/'
    });
  } else {
    buckets.bucketB_blogPosts.push({
      source: url,
      target: `/blog/`,
      statusCode: 301,
      reason: 'Unmatched post sitemap URL mapped to blog root'
    });
  }
}

// 3. Process Page Sitemap
for (const url of pageSitemapUrls) {
  if (categoryHubMap[url]) {
    buckets.bucketA_categoryHubs.push({
      url,
      ...categoryHubMap[url],
      statusCode: 200
    });
  } else if (legacyPageOverrides[url]) {
    buckets.bucketE_pageRedirects.push({
      source: url,
      target: legacyPageOverrides[url],
      statusCode: 301,
      reason: 'Legacy page slug aliased to canonical course or category hub'
    });
  } else {
    const slug = url.replace(/^\/|\/$/g, '');
    if (url === '/' || url === '/courses/' || url === '/contact-us/' || url === '/about-us/') {
      buckets.bucketD_directMatches.push({
        url,
        type: 'static_page',
        statusCode: 200
      });
    } else if (courseSlugs.has(slug)) {
      buckets.bucketD_directMatches.push({
        url,
        type: 'course_exact',
        statusCode: 200
      });
    } else if (blogSlugs.has(slug)) {
      buckets.bucketB_blogPosts.push({
        source: url,
        target: `/blog/${slug}/`,
        statusCode: 301,
        reason: 'Legacy page recognized as blog article'
      });
    } else {
      buckets.bucketE_pageRedirects.push({
        source: url,
        target: '/courses/',
        statusCode: 301,
        reason: 'Unmatched page sitemap URL redirected to courses index'
      });
    }
  }
}

// Deduplicate mappings
const report = {
  timestamp: new Date().toISOString(),
  sitemapsFound: {
    categorySitemap: categorySitemapUrls.length,
    pageSitemap: pageSitemapUrls.length,
    postSitemap: postSitemapUrls.length,
    totalUrls: categorySitemapUrls.length + pageSitemapUrls.length + postSitemapUrls.length
  },
  summary: {
    categoryHubsCount: buckets.bucketA_categoryHubs.length,
    blogRedirectsCount: buckets.bucketB_blogPosts.length,
    taxonomyRedirectsCount: buckets.bucketC_taxonomyArchives.length,
    directMatchesCount: buckets.bucketD_directMatches.length,
    pageRedirectsCount: buckets.bucketE_pageRedirects.length
  },
  buckets
};

const reportsDir = path.join(projectRoot, 'reports');
if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

const reportPath = path.join(reportsDir, 'sitemap-migration-map.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

console.log('═════════════════════════════════════════════════════');
console.log('       SITEMAP MIGRATION COVERAGE AUDIT             ');
console.log('═════════════════════════════════════════════════════');
console.log(`Source Sitemaps Location: ${sitemapDir}`);
console.log(`Total URLs Cataloged:     ${report.sitemapsFound.totalUrls}`);
console.log(`- Bucket A (Category Hubs):      ${report.summary.categoryHubsCount}`);
console.log(`- Bucket B (Blog 301 Redirects):  ${report.summary.blogRedirectsCount}`);
console.log(`- Bucket C (Taxonomy 301s):       ${report.summary.taxonomyRedirectsCount}`);
console.log(`- Bucket D (Direct 200 Matches):  ${report.summary.directMatchesCount}`);
console.log(`- Bucket E (Page 301 Redirects):  ${report.summary.pageRedirectsCount}`);
console.log(`Report successfully written to ${reportPath}`);
console.log('═════════════════════════════════════════════════════');
