import fs from 'fs';
import path from 'path';

const DIST_DIR = path.resolve(process.cwd(), 'dist');

let errors = 0;
let scannedFiles = 0;

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (fullPath.endsWith('.html')) {
      auditFile(fullPath);
    }
  }
}

function auditFile(filePath) {
  scannedFiles++;
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // Regex to match href="..."
  const hrefRegex = /href=["'](.*?)["']/g;
  let match;
  
  while ((match = hrefRegex.exec(content)) !== null) {
    const link = match[1];
    
    // Ignore external links, mailto, tel, anchor hashes, etc.
    if (
      link.startsWith('http://') ||
      link.startsWith('https://') ||
      link.startsWith('mailto:') ||
      link.startsWith('tel:') ||
      link.startsWith('#') ||
      link === '' ||
      link === '/' // root is technically a trailing slash
    ) {
      continue;
    }
    
    // Ignore static assets
    const assetRegex = /\.(png|jpg|jpeg|gif|svg|webp|ico|css|js|json|xml|pdf|txt|webmanifest|woff2)$/i;
    if (assetRegex.test(link)) {
      continue;
    }
    
    const cleanLink = link.split('?')[0].split('#')[0];
    
    // Valid links: /about-us/
    // Invalid links: /about-us
    if (!cleanLink.endsWith('/')) {
      console.error(`❌ Missing trailing slash: ${link} (in ${path.relative(process.cwd(), filePath)})`);
      errors++;
    }
  }
}

console.log('🔍 Auditing for trailing slashes in HTML files...');
if (!fs.existsSync(DIST_DIR)) {
  console.log('dist/ directory not found. Please run build first.');
  process.exit(1);
}

walkDir(DIST_DIR);

console.log(`\nScanned ${scannedFiles} HTML files.`);
if (errors > 0) {
  console.error(`\n❌ Trailing slash audit FAILED. Found ${errors} invalid links.`);
  process.exit(1);
} else {
  console.log('\n✅ Trailing slash audit PASSED. All internal links are strictly formatted.');
  process.exit(0);
}
