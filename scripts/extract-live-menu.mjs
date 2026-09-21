import fs from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';

async function extractMenu() {
  console.log('Fetching https://ask4trainings.pages.dev/...');
  const response = await fetch('https://ask4trainings.pages.dev/');
  const html = await response.text();
  
  const $ = cheerio.load(html);
  
  let allCoursesItem = null;
  $('.elementskit-navbar-nav > li').each((i, el) => {
    const text = $(el).children('a').text().trim().toLowerCase();
    if (text.includes('all courses')) {
      allCoursesItem = el;
    }
  });

  if (!allCoursesItem) {
    console.error('Could not find "All Courses" menu item');
    process.exit(1);
  }

  const taxonomy = {};
  
  // The categories are usually in the first sub-menu
  const categoryItems = $(allCoursesItem).children('.elementskit-submenu-panel').children('li');
  
  categoryItems.each((i, el) => {
    const catLink = $(el).children('a');
    const catName = catLink.text().trim();
    if (!catName) return;

    let catSlug = catName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    
    // Normalize to exact slugs requested if they match closely
    if (catSlug === 'trending-course') catSlug = 'trending-courses';
    
    taxonomy[catSlug] = {
      name: catName,
      slug: catSlug,
      courses: []
    };
    
    // Find courses under this category
    const courseItems = $(el).children('.elementskit-submenu-panel').children('li');
    courseItems.each((j, courseEl) => {
      const courseLink = $(courseEl).children('a');
      const courseTitle = courseLink.text().trim();
      let courseUrl = courseLink.attr('href') || '';
      
      // Extract slug from URL
      let slug = '';
      try {
        const urlObj = new URL(courseUrl);
        const parts = urlObj.pathname.split('/').filter(p => p);
        if (parts.length > 0) {
          slug = parts[parts.length - 1]; // e.g. /courses/xyz/ -> xyz or /xyz/ -> xyz
        }
      } catch (e) {
        // Handle relative URLs
        const parts = courseUrl.split('/').filter(p => p);
        if (parts.length > 0) {
          slug = parts[parts.length - 1];
        }
      }

      if (courseTitle && slug) {
        taxonomy[catSlug].courses.push({
          title: courseTitle,
          url: courseUrl,
          slug: slug
        });
      }
    });
  });

  fs.mkdirSync(path.join(process.cwd(), 'docs'), { recursive: true });
  fs.writeFileSync(
    path.join(process.cwd(), 'docs', 'canonical-menu-taxonomy.json'), 
    JSON.stringify(taxonomy, null, 2)
  );
  
  console.log('Extracted Taxonomy:', Object.keys(taxonomy));
  console.log('Done! Saved to docs/canonical-menu-taxonomy.json');
}

extractMenu().catch(console.error);
