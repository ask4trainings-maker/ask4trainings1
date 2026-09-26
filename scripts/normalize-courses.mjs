#!/usr/bin/env node
/**
 * normalize-courses.mjs
 * 
 * Normalizes course markdown frontmatter:
 * 1. Converts `whoShouldEnroll` string arrays → {title, description} objects
 * 2. Copies `eligibility` string arrays into normalized `whoShouldEnroll` if `whoShouldEnroll` is missing/empty
 * 3. Strips `duration` field from all `modules[]` items (auto-computed from topics.length)
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, resolve } from 'path';
import matter from 'gray-matter';

const COURSES_DIR = resolve('./src/content/courses');

function normalizeWhoShouldEnroll(raw) {
  if (!raw || !Array.isArray(raw) || raw.length === 0) return [];
  return raw.map(item => {
    if (typeof item === 'string') {
      // Parse JSON string if wrapped (legacy)
      try {
        const parsed = JSON.parse(item);
        return {
          title: parsed.title || parsed.question || 'Eligible Candidate',
          description: parsed.description || parsed.answer || item,
        };
      } catch {
        // Plain string — treat as description, generate a short title
        const title = item.split('.')[0].slice(0, 60).trim();
        return { title, description: item };
      }
    }
    if (typeof item === 'object' && item !== null) {
      return {
        title: item.title || item.question || 'Eligible Candidate',
        description: item.description || item.answer || '',
      };
    }
    return { title: 'Eligible Candidate', description: String(item) };
  });
}

function stripModuleDuration(modules) {
  if (!modules || !Array.isArray(modules)) return modules;
  return modules.map(mod => {
    const copy = { ...mod };
    // Remove duration field from each module object
    delete copy.duration;
    // Also normalize topics: if topics is array of {topic: string}, keep as-is (CMS format)
    return copy;
  });
}

const files = readdirSync(COURSES_DIR).filter(f => f.endsWith('.md'));
let changed = 0;

for (const file of files) {
  const filePath = join(COURSES_DIR, file);
  const raw = readFileSync(filePath, 'utf8');
  const parsed = matter(raw);
  const data = parsed.data;
  let dirty = false;

  // 1. Normalize whoShouldEnroll
  const wse = data.whoShouldEnroll;
  if (Array.isArray(wse) && wse.length > 0) {
    const firstItem = wse[0];
    // Already normalized if first item is an object with title/description
    const alreadyNormalized =
      typeof firstItem === 'object' &&
      firstItem !== null &&
      ('title' in firstItem || 'description' in firstItem);
    if (!alreadyNormalized) {
      data.whoShouldEnroll = normalizeWhoShouldEnroll(wse);
      dirty = true;
    }
  } else if (!wse || (Array.isArray(wse) && wse.length === 0)) {
    // Try to source from eligibility if it's a string array
    const elig = data.eligibility;
    if (Array.isArray(elig) && elig.length > 0) {
      data.whoShouldEnroll = normalizeWhoShouldEnroll(elig);
      dirty = true;
    }
  }

  // 2. Strip duration from modules[]
  if (Array.isArray(data.modules) && data.modules.length > 0) {
    const stripped = stripModuleDuration(data.modules);
    // Only mark dirty if any module actually had a duration field
    const hadDuration = data.modules.some(m => 'duration' in m);
    if (hadDuration) {
      data.modules = stripped;
      dirty = true;
    }
  }

  if (dirty) {
    const updated = matter.stringify(parsed.content, data);
    writeFileSync(filePath, updated, 'utf8');
    console.log(`  ✓ Updated: ${file}`);
    changed++;
  }
}

console.log(`\nDone. ${changed}/${files.length} files updated.`);
