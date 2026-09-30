import fs from 'fs';
import path from 'path';

const BLOG_DIR = path.join(process.cwd(), 'src', 'content', 'blog');

const files = fs.readdirSync(BLOG_DIR).filter(file => file.endsWith('.md'));

let processedCount = 0;

for (const file of files) {
  const filePath = path.join(BLOG_DIR, file);
  let content = fs.readFileSync(filePath, 'utf-8');

  // Replace Enroll Now block
  const enrollRegex = /<div class="not-prose[^>]*>(?:(?!<div class="not-prose)[\s\S])*?Ready to Start Learning(?:(?!<div class="not-prose)[\s\S])*?<\/a>\s*<\/div>/gi;
  content = content.replace(enrollRegex, '\n\n::enroll-now\n\n');

  // Replace WhatsApp block
  const whatsappRegex = /<div class="not-prose[^>]*>(?:(?!<div class="not-prose)[\s\S])*?Need a Demo Session(?:(?!<div class="not-prose)[\s\S])*?<\/a>\s*<\/div>/gi;
  content = content.replace(whatsappRegex, '\n\n::whatsapp-us\n\n');

  // Normalize triple newlines to double
  content = content.replace(/\n{3,}/g, '\n\n');

  fs.writeFileSync(filePath, content, 'utf-8');
  processedCount++;
}

console.log(`Sanitized ${processedCount} blog posts.`);
