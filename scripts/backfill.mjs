import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const coursesDir = path.join(process.cwd(), 'src', 'content', 'courses');
const categoriesPath = path.join(process.cwd(), 'src', 'data', 'categories.json');

const categoriesData = JSON.parse(fs.readFileSync(categoriesPath, 'utf8'));
const categoryMap = {};

// Hardcode some specific mapping rules as requested by user
categoryMap['guidewire'] = 'Guidewire Suite';
categoryMap['ms-d365'] = 'Microsoft Dynamics 365';
categoryMap['devops'] = 'Cloud & DevOps';

// Fallback to title from categories.json
categoriesData.categories.forEach(cat => {
  if (!categoryMap[cat.id]) {
    categoryMap[cat.id] = cat.title;
  }
});

const files = fs.readdirSync(coursesDir).filter(f => f.endsWith('.md'));

files.forEach(file => {
  const filePath = path.join(coursesDir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  const parsed = matter(content);

  let dirty = false;

  // 1. Backfill navigationLocation
  const catSlug = parsed.data.category || 'other-tools';
  const catName = categoryMap[catSlug] || 'Other Tools';
  const courseTitle = parsed.data.title || '';
  
  const expectedNavLoc = `Navigation Bar > All Courses > ${catName} > ${courseTitle}`;
  if (parsed.data.navigationLocation !== expectedNavLoc) {
    parsed.data.navigationLocation = expectedNavLoc;
    dirty = true;
  }

  // 2. Clean up eligibility stringified JSON
  const cleanList = (list) => {
    if (!Array.isArray(list)) return list;
    return list.map(item => {
      if (typeof item === 'string') {
        if (item.trim().startsWith('{') && item.trim().endsWith('}')) {
          try {
            return JSON.parse(item);
          } catch (e) {
            // not valid JSON, leave as is
          }
        }
      }
      return item;
    });
  };

  if (parsed.data.eligibility) {
    const orig = JSON.stringify(parsed.data.eligibility);
    parsed.data.eligibility = cleanList(parsed.data.eligibility);
    if (JSON.stringify(parsed.data.eligibility) !== orig) {
      dirty = true;
    }
  }

  if (parsed.data.whoShouldEnroll) {
    const orig = JSON.stringify(parsed.data.whoShouldEnroll);
    parsed.data.whoShouldEnroll = cleanList(parsed.data.whoShouldEnroll);
    if (JSON.stringify(parsed.data.whoShouldEnroll) !== orig) {
      dirty = true;
    }
  }

  if (dirty) {
    // Generate new content
    const newContent = matter.stringify(parsed.content, parsed.data);
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`Updated ${file}`);
  }
});
