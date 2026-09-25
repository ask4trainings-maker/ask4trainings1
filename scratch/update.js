const fs = require('fs');
const YAML = require('yaml');

const yml = fs.readFileSync('../public/admin/config.yml', 'utf8');
const doc = YAML.parseDocument(yml);

const courses = doc.get('collections').items.find(c => c.get('name') === 'courses');
const fields = courses.get('fields');

// 1. Rename existing fields or add new ones if they don't exist.
// Let's create a map of existing fields
const fieldMap = new Map();
fields.items.forEach(f => {
  fieldMap.set(f.get('name'), f);
});

// Update Curriculum Modules to modules
if (fieldMap.has('curriculum')) {
  const curriculum = fieldMap.get('curriculum');
  curriculum.set('name', 'modules');
  curriculum.set('summary', 'Module: {{fields.title}} ({{fields.duration}})');
  // Update fields inside modules to have title and duration
  const cFields = curriculum.get('fields');
  cFields.items[0].set('name', 'title');
  // Add duration
  const durField = new YAML.YAMLMap();
  durField.set('label', 'Duration');
  durField.set('name', 'duration');
  durField.set('widget', 'string');
  durField.set('required', false);
  cFields.items.splice(1, 0, durField);
  
  fieldMap.set('modules', curriculum);
}

// Update faqs
if (fieldMap.has('faqs')) {
  const faqs = fieldMap.get('faqs');
  faqs.set('summary', 'Q: {{fields.question}}');
}

// Update eligibility to whoShouldEnroll
if (fieldMap.has('eligibility')) {
  const who = fieldMap.get('eligibility');
  who.set('name', 'whoShouldEnroll');
  who.set('summary', '{{fields.title}}');
  // update question to title
  const wFields = who.get('fields');
  wFields.items[0].set('name', 'title');
  fieldMap.set('whoShouldEnroll', who);
}

// Update upcomingBatch to batches
if (fieldMap.has('upcomingBatch')) {
  const batches = fieldMap.get('upcomingBatch');
  batches.set('name', 'batches');
  batches.set('widget', 'list');
  batches.set('summary', '{{fields.type}} · {{fields.startDate}}');
  const bFields = batches.get('fields');
  const typeField = new YAML.YAMLMap();
  typeField.set('label', 'Type');
  typeField.set('name', 'type');
  typeField.set('widget', 'string');
  bFields.items.unshift(typeField);
  fieldMap.set('batches', batches);
}

// Priority Tier Widget
if (fieldMap.has('priorityTier')) {
  const pt = fieldMap.get('priorityTier');
  pt.set('label', '🌟 Course Promotion Tier');
  pt.set('widget', 'select');
  pt.set('default', 'tier-2');
  pt.set('hint', 'Controls where this course ranks on the homepage and catalog search.');
  
  const options = new YAML.YAMLSeq();
  const o1 = new YAML.YAMLMap(); o1.set('label', '🌟 Tier 1: Flagship Program (Top Priority Placement)'); o1.set('value', 'tier-1');
  const o2 = new YAML.YAMLMap(); o2.set('label', '📈 Tier 2: Core Growth Course'); o2.set('value', 'tier-2');
  const o3 = new YAML.YAMLMap(); o3.set('label', '📘 Tier 3: Specialized / Supporting Course'); o3.set('value', 'tier-3');
  options.items.push(o1, o2, o3);
  pt.set('options', options);
}

// Domain Category Widget
if (fieldMap.has('category')) {
  const cat = fieldMap.get('category');
  const catOptions = new YAML.YAMLSeq();
  const domains = [
    { label: "🛡️ Guidewire Suite", value: "guidewire" },
    { label: "⚙️ Siemens Teamcenter / PLM", value: "siemens" },
    { label: "🔷 SAP Solutions", value: "sap" },
    { label: "☁️ Cloud Computing", value: "cloud-computing" },
    { label: "🔧 DevOps", value: "devops" },
    { label: "💻 Software Development", value: "development" },
    { label: "🌐 Microsoft Dynamics 365", value: "ms-d365" },
    { label: "🔶 Oracle Cloud", value: "oracle" },
    { label: "🚀 Trending Technologies", value: "trending-courses" },
    { label: "✨ New Courses", value: "new-courses" },
    { label: "🧰 Other Specialized Tools", value: "other-tools" }
  ];
  domains.forEach(d => {
    const m = new YAML.YAMLMap();
    m.set('label', d.label);
    m.set('value', d.value);
    catOptions.items.push(m);
  });
  cat.set('options', catOptions);
}

// Contextual Field Guidance
if (fieldMap.has('navigationLocation')) {
  fieldMap.get('navigationLocation').set('hint', "Follow format: 'Navigation Bar > All Courses > Guidewire Suite > Guidewire PolicyCenter Training'");
}
if (fieldMap.has('metaDescription')) {
  fieldMap.get('metaDescription').set('hint', 'Google search snippet text. Aim for 140–160 characters describing the course value.');
}
if (fieldMap.has('duration')) {
  fieldMap.get('duration').set('hint', "Example: '45-60 Hrs' or '6 Weeks (Weekend Batches)'");
}
if (fieldMap.has('thumbnail')) {
  fieldMap.get('thumbnail').set('label', 'Course Hero / Thumbnail Image (16:9, max 500KB)');
  fieldMap.get('thumbnail').set('hint', 'Upload a clean, high-resolution hero image. Will be automatically optimized on build.');
}
if (fieldMap.has('trainer')) {
  const trainer = fieldMap.get('trainer');
  const tFields = trainer.get('fields');
  const imgField = tFields.items.find(i => i.get('name') === 'image');
  if (imgField) {
    imgField.set('label', 'Trainer Headshot (Square 1:1, min 400x400px)');
    imgField.set('hint', 'Upload a clean, high-resolution instructor portrait. Will be automatically optimized on build.');
  }
}

// Reordering fields
const desiredOrder = [
  // Header & Navigation Metadata
  'navigationLocation', 'priorityTier', 'title', 'shortCode', 'category',
  // Hero Value Proposition & Schedule
  'valueProp', 'batchInfo', 'rating',
  // Curriculum & Lab Modules
  'highlights', 'modules',
  // Trainer Profile & Credentials
  'trainer',
  // Audience & FAQs
  'whoShouldEnroll', 'faqs',
  // SEO & Social Sharing
  'metaTitle', 'metaDescription'
];

const newItems = [];
const seen = new Set();

desiredOrder.forEach(name => {
  if (fieldMap.has(name)) {
    newItems.push(fieldMap.get(name));
    seen.add(name);
  } else {
    // maybe create it if requested
    if (name === 'batchInfo') {
      if (fieldMap.has('batchInfoText')) {
        const bInfo = fieldMap.get('batchInfoText');
        bInfo.set('name', 'batchInfo');
        newItems.push(bInfo);
        seen.add('batchInfoText');
        seen.add('batchInfo');
      } else {
        const bInfo = new YAML.YAMLMap();
        bInfo.set('label', 'Batch Info');
        bInfo.set('name', 'batchInfo');
        bInfo.set('widget', 'string');
        bInfo.set('required', false);
        newItems.push(bInfo);
        seen.add(name);
      }
    } else if (name === 'valueProp') {
      const vProp = new YAML.YAMLMap();
      vProp.set('label', 'Value Proposition');
      vProp.set('name', 'valueProp');
      vProp.set('widget', 'string');
      vProp.set('required', false);
      vProp.set('hint', 'Main hero subtitle/value proposition.');
      newItems.push(vProp);
      seen.add(name);
    }
  }
});

// Append the rest
fields.items.forEach(f => {
  if (!seen.has(f.get('name'))) {
    newItems.push(f);
  }
});

fields.items = newItems;

fs.writeFileSync('../public/admin/config.yml', doc.toString());
