import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const contentDir = path.join(process.cwd(), 'src/content/courses');

function processCourses() {
  const files = fs.readdirSync(contentDir).filter(file => file.endsWith('.md'));
  let updatedCount = 0;

  for (const file of files) {
    const filePath = path.join(contentDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Parse using gray-matter
    const parsed = matter(content);
    const data = parsed.data;

    // Backfill standard 13-section default properties if not present
    data.duration = data.duration || data.batchInfo?.duration || '45-60 Hrs';
    data.mode = data.mode || data.batchInfo?.format || 'Online Live Interactive';
    data.rating = data.rating || '4.9/5 (1,200+ Reviews)';
    data.brochureUrl = data.brochureUrl || '[https://drive.google.com/](https://drive.google.com/)';
    
    if (!data.benefits) {
      data.benefits = { basicKnowledge: [], techSkills: [], careerInterests: [] };
    }
    
    if (!data.trainerProfile) {
      data.trainerProfile = {
        heading: 'Learn from Practicing Enterprise Architects',
        description: 'Our instructors are active industry leaders and enterprise consultants with a minimum of 10+ years of production experience.',
        highlights: [
          '10+ Years of Enterprise Production Experience',
          'Certified Subject Matter Experts in Consulting Roles',
          'Direct 1-on-1 Sandbox Debugging and Mentorship',
          'Real-world Case Studies & Architecture Reviews',
        ]
      };
    }
    
    data.eligibility = data.eligibility || [];
    data.jobRoles = data.jobRoles || [];

    // Map legacy syllabus to handle moduleTitle safely
    if (data.syllabus && Array.isArray(data.syllabus)) {
      data.syllabus = data.syllabus.map(mod => {
        if (mod.module && !mod.moduleTitle) {
          mod.moduleTitle = mod.module;
        }
        return mod;
      });
    }

    // Safely convert to string using gray-matter (which uses js-yaml)
    // lineWidth: -1 prevents js-yaml from word-wrapping long descriptions and breaking them
    // noRefs: true prevents using YAML anchors and aliases
    const updatedContent = matter.stringify(parsed.content, data, {
      lineWidth: -1,
      noRefs: true,
      noCompatMode: true
    });

    fs.writeFileSync(filePath, updatedContent, 'utf8');
    updatedCount++;
  }

  console.log(`Successfully standardized frontmatter for ${updatedCount} courses.`);
}

processCourses();
