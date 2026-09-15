import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const blogDir = path.join(process.cwd(), 'src/content/blog');

const slugs = [
  'microsoft-dynamics-365-crm-online-training',
  'best-ms-dynamics-365-fo-online-course',
  'salesforce-revenue-cloud-online-course',
  'sap-mm-online-training-in-hyderabad',
  'best-mendix-online-training',
  'best-guidewire-automation-testing-online-course',
  'cybersecurity-training-in-hyderabad',
  'best-coupa-online-course-in-hyderabad',
  'best-digital-marketing-online-course',
  'best-guidewire-rating-online-training'
];

function formatTitle(slug) {
  // Convert slug to human-readable title (Title Case)
  return slug
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function getCategory(slug) {
  if (slug.includes('dynamics')) return 'MS D365';
  if (slug.includes('salesforce')) return 'Salesforce';
  if (slug.includes('sap')) return 'SAP';
  if (slug.includes('guidewire')) return 'Guidewire';
  if (slug.includes('cybersecurity')) return 'Cybersecurity';
  return 'Enterprise IT';
}

function cleanFrontmatter() {
  slugs.forEach(slug => {
    const blogFile = path.join(blogDir, `${slug}.md`);
    if (!fs.existsSync(blogFile)) {
      console.warn(`File not found: ${blogFile}`);
      return;
    }

    const title = formatTitle(slug);
    const category = getCategory(slug);
    const publishDate = '2026-08-15';
    const description = `Comprehensive guide to mastering ${title}, covering core architecture, implementation strategies, and enterprise career paths.`;

    const content = `---
title: "${title}"
publishDate: ${publishDate}
author: "Ask4Trainings Editorial"
category: "${category}"
description: "${description}"
featured: false
draft: false
---

## Introduction

${title} has become an essential enterprise solution for driving business outcomes, operational intelligence, and process automation.

## Why Learn ${title}?

Enterprises worldwide rely on these tools to streamline workflows and enhance efficiency. Mastering this platform opens doors to high-demand roles in enterprise consulting and architecture.
`;

    fs.writeFileSync(blogFile, content, 'utf8');
    console.log(`Cleaned ${slug}.md`);
  });
}

cleanFrontmatter();
console.log("Frontmatter cleanup complete.");
