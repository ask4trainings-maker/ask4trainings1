import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

const csvPath = path.join(rootDir, 'docs', 'Ask4Trainings URL Migration Map - Master Migration.csv');
const coursesDir = path.join(rootDir, 'src', 'content', 'courses');
const redirectsPath = path.join(rootDir, 'public', '_redirects');
const categoriesPath = path.join(rootDir, 'src', 'content', 'categories.json');

async function run() {
  await fs.mkdir(coursesDir, { recursive: true });
  
  const csvContent = await fs.readFile(csvPath, 'utf-8');
  const categoriesRaw = await fs.readFile(categoriesPath, 'utf-8');
  const categoriesData = JSON.parse(categoriesRaw);
  const validCategories = Object.keys(categoriesData);

  const lines = csvContent.split('\n').map(l => l.trim()).filter(Boolean);
  const redirects = new Set();
  
  const assignCategory = (slug) => {
    if (slug.includes('guidewire')) return 'guidewire';
    if (slug.includes('teamcenter') || slug.includes('polarion') || slug.includes('camstar')) return 'siemens';
    if (slug.includes('sap') || slug.includes('ariba')) return 'sap';
    if (slug.includes('oracle')) return 'oracle';
    if (slug.includes('salesforce') || slug.includes('servicenow')) return 'trending-courses';
    if (slug.includes('snowflake') || slug.includes('aws') || slug.includes('azure') || slug.includes('gcp') || slug.includes('oci') || slug.includes('cloud')) return 'cloud-computing';
    if (slug.includes('java') || slug.includes('python') || slug.includes('mern') || slug.includes('development')) return 'development';
    if (slug.includes('docker') || slug.includes('kubernetes') || slug.includes('terraform') || slug.includes('ci-cd') || slug.includes('devops')) return 'devops';
    if (slug.includes('dynamics') || slug.includes('d365')) return 'ms-d365';
    if (slug.includes('kinaxis') || slug.includes('palantir')) return 'new-courses';
    return 'other-tools';
  };

  const titleCase = (str) => {
    return str.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(',');
    const url = row[0];
    const clicks = parseInt(row[1]) || 0;
    const impressions = parseInt(row[2]) || 0;
    
    // e.g. https://ask4trainings.com/coupa-online-training/ -> /coupa-online-training/
    let urlPath = url.replace('https://ask4trainings.com', '');
    if (urlPath === '/' || urlPath === '') continue; // Skip root
    
    let slug = urlPath.replace(/\//g, '');
    
    const isCategoryOrTag = urlPath.includes('/category/') || urlPath.includes('/author/') || urlPath.includes('/tag/') || urlPath.includes('/page/') || urlPath.includes('/wp-content') || urlPath.endsWith('.jpg') || urlPath.endsWith('.png') || urlPath.endsWith('.jpeg');
    const isTrainable = !isCategoryOrTag && (slug.includes('training') || slug.includes('course') || slug.includes('center') || slug.includes('dynamics') || slug.includes('cloud') || slug.includes('testing') || slug.includes('automation') || (clicks > 0));

    if (isCategoryOrTag || !isTrainable) {
      if (!urlPath.includes('/wp-content') && !urlPath.endsWith('.jpg') && !urlPath.endsWith('.png') && !urlPath.endsWith('.jpeg')) {
        redirects.add(`${urlPath} /courses/ 301`);
      }
      continue;
    }
    
    // Some legacy URLs mapped to specific new routes based on Master Migration
    // The instructions say "every unique trainable course row and extract its canonical slug"
    // "ensure every sub-course link dynamically references /${course.slug}"
    
    const category = assignCategory(slug);
    if (!validCategories.includes(category)) {
      console.warn(`Warning: Category ${category} not found in categories.json for slug ${slug}`);
    }
    
    let cleanTitle = slug.replace(/-online-training/g, '').replace(/-training/g, '').replace(/-in-hyderabad/g, '').replace(/-online/g, '').replace(/coursein-hyderabad/g, 'data-science');
    let title = titleCase(cleanTitle) + " Training";
    let metaTitle = `${title} | Ask 4 Trainings`;
    if (metaTitle.length > 60) {
      metaTitle = metaTitle.substring(0, 57) + "...";
    }
    
    const mdContent = `---
title: "${title}"
slug: "${slug}"
category: "${category}"
valueProp: "Master ${title} with our enterprise-grade curriculum and secure high-impact roles."
highlights:
  - icon: "M13 10V3L4 14h7v7l9-11h-7z"
    text: "Industry Expert Instructors"
  - icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
    text: "Real-world Projects"
  - icon: "M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
    text: "100% Placement Assistance"
syllabus:
  - module: "Module 1: Introduction to ${titleCase(cleanTitle)}"
    topics:
      - "Architecture and Core Concepts"
      - "Installation and Setup"
      - "Navigation and UI"
  - module: "Module 2: Advanced Configuration"
    topics:
      - "Data Modeling"
      - "Business Logic Implementation"
      - "Security and Access Control"
  - module: "Module 3: Integration and APIs"
    topics:
      - "RESTful APIs and Web Services"
      - "Batch Processing"
      - "Event Messaging"
  - module: "Module 4: Real-time Project implementation"
    topics:
      - "End to end project setup"
      - "Deployment and CI/CD"
      - "Troubleshooting and Best Practices"
batchInfo:
  format: "Online"
  duration: "45-60 Hrs"
faqs:
  - question: "Who should take this ${title}?"
    answer: "This course is ideal for IT professionals, developers, and analysts looking to build a career in this domain."
  - question: "Are there any prerequisites?"
    answer: "Basic understanding of IT concepts is recommended but not strictly required."
  - question: "Do you provide placement assistance?"
    answer: "Yes, we provide 100% placement assistance, resume building, and mock interviews."
seo:
  metaTitle: "${metaTitle}"
  metaDescription: "Enroll in the best ${title}. Get hands-on experience with real-time projects and secure your dream job."
legacyUrl: "${url}"
legacyImpressions: ${impressions}
---

This is the canonical course page for ${title}. Start your learning journey today with Ask 4 Trainings.
`;
    await fs.writeFile(path.join(coursesDir, `${slug}.md`), mdContent);
  }

  // Create public dir if it doesn't exist
  await fs.mkdir(path.join(rootDir, 'public'), { recursive: true });
  
  // Write redirects
  if (redirects.size > 0) {
    await fs.writeFile(redirectsPath, Array.from(redirects).join('\n') + '\n');
  }

  console.log(`Successfully generated markdown files and _redirects.`);
}

run().catch(console.error);
