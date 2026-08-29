import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');
const distDir = path.join(rootDir, 'dist');

async function getFiles(dir, fileList = []) {
  const files = await fs.readdir(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if ((await fs.stat(filePath)).isDirectory()) {
      await getFiles(filePath, fileList);
    } else {
      fileList.push(filePath);
    }
  }
  return fileList;
}

async function verifyLinks() {
  const allFiles = await getFiles(distDir);
  const htmlFiles = allFiles.filter(f => f.endsWith('.html'));
  let brokenLinks = 0;
  
  // Cache of existing paths to speed up checking
  const validPaths = new Set();
  allFiles.forEach(f => {
    let relPath = f.replace(distDir, '');
    validPaths.add(relPath);
  });

  const checkPathExists = (linkPath) => {
    // Exact match
    if (validPaths.has(linkPath)) return true;
    
    // Check if it's a directory containing index.html
    let dirPath = linkPath.endsWith('/') ? linkPath : `${linkPath}/`;
    if (validPaths.has(`${dirPath}index.html`)) return true;
    
    // Check without trailing slash index.html
    if (validPaths.has(`${linkPath}/index.html`)) return true;
    
    return false;
  };

  for (const file of htmlFiles) {
    const content = await fs.readFile(file, 'utf-8');
    // Basic regex to find hrefs
    const regex = /href=["'](.*?)["']/g;
    let match;
    
    while ((match = regex.exec(content)) !== null) {
      let href = match[1];
      
      // We only check root-relative internal links
      if (href.startsWith('/') && !href.startsWith('//')) {
        // Strip query params and hashes
        href = href.split('?')[0].split('#')[0];
        if (!href) continue; // It was just a # or ? link
        
        const exists = checkPathExists(href);
        if (!exists) {
          console.error(`❌ Broken link found in ${file.replace(distDir, '')}: ${href}`);
          brokenLinks++;
        }
      }
    }
  }

  if (brokenLinks > 0) {
    console.error(`\nFAILED: Found ${brokenLinks} broken internal links.`);
    process.exit(1);
  } else {
    console.log(`\nSUCCESS: 0 broken internal links found across ${htmlFiles.length} pages.`);
    process.exit(0);
  }
}

verifyLinks().catch(err => {
  console.error(err);
  process.exit(1);
});
