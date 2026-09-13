import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TAXONOMY_FILE = path.join(__dirname, '../docs/canonical-menu-taxonomy.json');
const COURSES_DIR = path.join(__dirname, '../src/content/courses');
const VALID_CATEGORIES = [
  'guidewire', 'siemens', 'new-courses', 'cloud-computing',
  'oracle', 'devops', 'development', 'ms-d365',
  'sap', 'trending-courses', 'other-tools'
];

async function syncTaxonomy() {
  const taxonomyRaw = fs.readFileSync(TAXONOMY_FILE, 'utf-8');
  const taxonomyData = JSON.parse(taxonomyRaw);
  
  // Build lookup map: slug -> { category: string, menuTitle: string }
  const courseLookup = new Map();
  for (const [categorySlug, categoryInfo] of Object.entries(taxonomyData)) {
    if (!VALID_CATEGORIES.includes(categorySlug)) continue;
    for (const course of categoryInfo.courses) {
      if (course.slug === '#' || course.url === '#') continue;
      
      // Standardize the slug
      courseLookup.set(course.slug, {
        category: categorySlug,
        menuTitle: course.title
      });
    }
  }

  const files = fs.readdirSync(COURSES_DIR).filter(f => f.endsWith('.md') || f.endsWith('.mdx'));
  
  for (const file of files) {
    const filePath = path.join(COURSES_DIR, file);
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const slug = file.replace(/\.mdx?$/, '');
    
    // Parse using gray-matter
    const parsed = matter(fileContent);
    const data = parsed.data;
    
    let newCategory = data.category;
    let newMenuTitle = data.menuTitle;

    // 1. Exact match
    const match = courseLookup.get(slug);
    if (match) {
      newCategory = match.category;
      newMenuTitle = match.menuTitle;
    } else {
      // 2. Semantic Prefix Match
      if (slug.includes('guidewire-')) newCategory = 'guidewire';
      else if (slug.includes('sap-')) newCategory = 'sap';
      else if (slug.includes('dynamics-') || slug.includes('d365')) newCategory = 'ms-d365';
      else if (slug.includes('oracle-')) newCategory = 'oracle';
      else if (slug.includes('teamcenter') || slug.includes('polarion') || slug.includes('mendix')) newCategory = 'siemens';
      else if (slug.includes('salesforce') || slug.includes('snowflake') || slug.includes('mulesoft')) newCategory = 'cloud-computing';
      else if (slug.includes('devops')) newCategory = 'devops';
      else if (slug.includes('java-') || slug.includes('python-') || slug.includes('dotnet-')) newCategory = 'development';
      else {
        // 3. Keep existing if valid
        if (!VALID_CATEGORIES.includes(newCategory)) {
          // Fallback to other-tools
          newCategory = 'other-tools';
        }
      }
    }

    if (!VALID_CATEGORIES.includes(newCategory)) {
      newCategory = 'other-tools';
    }

    // Preserve SEO title, add menuTitle
    if (data.category !== newCategory || (newMenuTitle && data.menuTitle !== newMenuTitle)) {
      data.category = newCategory;
      if (newMenuTitle) {
        data.menuTitle = newMenuTitle;
      }
      
      // Dump back to file
      const updatedContent = matter.stringify(parsed.content, data);
      fs.writeFileSync(filePath, updatedContent);
      console.log(`Updated: ${slug} -> ${newCategory}`);
    }
  }
}

syncTaxonomy().catch(console.error);
