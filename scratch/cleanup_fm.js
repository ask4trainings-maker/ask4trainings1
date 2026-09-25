const fs = require('fs');
const path = require('path');
const glob = require('glob');

const coursesDir = path.join(__dirname, '../src/content/courses');
const files = glob.sync(`${coursesDir}/**/*.md`);

let modifiedCount = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let lines = content.split(/\r?\n/);
  
  let newLines = [];
  let inRootHighlights = false;
  let inCourseHighlights = false;
  let inTrainer = false;
  let changed = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Detect root highlights
    if (line.match(/^highlights:\s*(?:\[\])?\s*$/)) {
      inRootHighlights = true;
      changed = true;
      continue;
    }
    // Detect courseHighlights
    if (line.match(/^courseHighlights:\s*(?:\[\])?\s*$/)) {
      inCourseHighlights = true;
      changed = true;
      continue;
    }

    // Skip lines under root highlights until we hit a non-indented line
    if (inRootHighlights) {
      if (line.startsWith(' ') || line.startsWith('-')) {
        continue;
      } else {
        inRootHighlights = false;
      }
    }
    
    // Skip lines under courseHighlights until we hit a non-indented line
    if (inCourseHighlights) {
      if (line.startsWith(' ') || line.startsWith('-')) {
        continue;
      } else {
        inCourseHighlights = false;
      }
    }

    // Detect trainer block
    if (line.match(/^trainer:\s*$/)) {
      inTrainer = true;
    } else if (inTrainer && !line.startsWith(' ') && line.trim() !== '') {
      inTrainer = false;
    }

    // If inside trainer block, skip image line
    if (inTrainer) {
      if (line.match(/^[ \t]+image:\s*(?:'.*'|".*"|.*?)\s*$/)) {
        changed = true;
        continue;
      }
    }

    newLines.push(line);
  }

  if (changed) {
    fs.writeFileSync(file, newLines.join('\n'), 'utf8');
    modifiedCount++;
  }
});

console.log(`Modified ${modifiedCount} files.`);
