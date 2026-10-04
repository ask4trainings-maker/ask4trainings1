import fs from 'fs/promises';
import path from 'path';
import https from 'https';
import http from 'http';
import { globSync } from 'glob';
import matter from 'gray-matter';

const TARGET_DIR = path.join(process.cwd(), 'src/assets/blog');
const BLOG_DIR = path.join(process.cwd(), 'src/content/blog');

// Helper to download image
async function downloadImage(url, dest) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return downloadImage(res.headers.location, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to download ${url}: ${res.statusCode}`));
      }
      const file = fs.writeFile(dest, ''); // Just touching the file for createWriteStream
      import('fs').then(fsSync => {
        const fileStream = fsSync.createWriteStream(dest);
        res.pipe(fileStream);
        fileStream.on('finish', () => {
          fileStream.close();
          resolve();
        });
        fileStream.on('error', (err) => {
          fs.unlink(dest).catch(() => {});
          reject(err);
        });
      });
    }).on('error', (err) => {
      fs.unlink(dest).catch(() => {});
      reject(err);
    });
  });
}

function sanitizeFilename(url) {
  try {
    const parsed = new URL(url);
    const basename = path.basename(parsed.pathname);
    return decodeURIComponent(basename).replace(/[^a-zA-Z0-9.\-_]/g, '_');
  } catch (e) {
    return `image_${Date.now()}.jpg`;
  }
}

async function processBlogs() {
  await fs.mkdir(TARGET_DIR, { recursive: true });
  const files = globSync(`${BLOG_DIR}/**/*.md`);
  let downloadedCount = 0;
  
  for (const file of files) {
    let content = await fs.readFile(file, 'utf8');
    const parsed = matter(content);
    let modified = false;

    // 1. Process Frontmatter Image
    if (parsed.data.image && typeof parsed.data.image === 'string' && parsed.data.image.startsWith('http')) {
      const url = parsed.data.image;
      const filename = sanitizeFilename(url);
      const dest = path.join(TARGET_DIR, filename);
      
      const exists = await fs.access(dest).then(() => true).catch(() => false);
      if (!exists) {
        console.log(`Downloading ${url} -> ${filename}`);
        try {
          await downloadImage(url, dest);
          downloadedCount++;
        } catch (e) {
          console.error(`Error downloading ${url}:`, e.message);
        }
      }
      parsed.data.image = `../../assets/blog/${filename}`;
      modified = true;
    }

    // 2. Process Body Images (Regex for ![alt](url) and <img src="url">)
    const mdRegex = /!\[([^\]]*)\]\((https?:\/\/[^\)]+)\)/g;
    let match;
    while ((match = mdRegex.exec(parsed.content)) !== null) {
      const fullMatch = match[0];
      const alt = match[1];
      const url = match[2];
      
      if (url.includes('ask4trainings.com')) {
        const filename = sanitizeFilename(url);
        const dest = path.join(TARGET_DIR, filename);
        
        const exists = await fs.access(dest).then(() => true).catch(() => false);
        if (!exists) {
          console.log(`Downloading body image ${url} -> ${filename}`);
          try {
            await downloadImage(url, dest);
            downloadedCount++;
          } catch (e) {
            console.error(`Error downloading body image ${url}:`, e.message);
          }
        }
        
        // Replace in content
        parsed.content = parsed.content.replace(fullMatch, `![${alt}](../../assets/blog/${filename})`);
        modified = true;
      }
    }
    
    // Process HTML img tags
    const htmlRegex = /<img[^>]+src="([^">]+)"[^>]*>/g;
    while ((match = htmlRegex.exec(parsed.content)) !== null) {
      const fullMatch = match[0];
      const url = match[1];
      if (url.startsWith('http') && url.includes('ask4trainings.com')) {
        const filename = sanitizeFilename(url);
        const dest = path.join(TARGET_DIR, filename);
        
        const exists = await fs.access(dest).then(() => true).catch(() => false);
        if (!exists) {
          console.log(`Downloading body HTML image ${url} -> ${filename}`);
          try {
            await downloadImage(url, dest);
            downloadedCount++;
          } catch (e) {
            console.error(`Error downloading HTML image ${url}:`, e.message);
          }
        }
        
        parsed.content = parsed.content.replace(url, `../../assets/blog/${filename}`);
        modified = true;
      }
    }

    if (modified) {
      const newContent = matter.stringify(parsed.content, parsed.data);
      await fs.writeFile(file, newContent);
    }
  }
  
  console.log(`Finished processing. Downloaded ${downloadedCount} new images.`);
}

processBlogs().catch(console.error);
