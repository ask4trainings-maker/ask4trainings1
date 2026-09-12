import fs from 'node:fs';
import * as cheerio from 'cheerio'; // npm install cheerio

const manifest = JSON.parse(fs.readFileSync('./migration-manifest.json', 'utf-8'));
const courses = manifest.filter(item => item.type === 'course');

for (const course of courses) {
  const url = `https://ask4trainings.com${course.legacyUrl}`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) continue;
    
    const html = await res.text();
    const $ = cheerio.load(html);
    
    // WordPress typical content containers
    const content = $('.entry-content, .course-curriculum, article').text().trim();
    
    // Save raw text cache for agent conversion
    fs.mkdirSync('./content-cache', { recursive: true });
    fs.writeFileSync(`./content-cache/${course.slug}.txt`, content);
    console.log(`Saved: ${course.slug}`);
  } catch (err) {
    console.warn(`Failed fetching ${url}:`, err.message);
  }
}