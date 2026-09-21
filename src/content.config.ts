import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const courses = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/courses" }),
  schema: z.object({
    // Core Metadata
    title: z.string(),
    metaTitle: z.string().optional(),
    metaDescription: z.string().optional(),
    category: z.string().default('other-tools'),
    menuTitle: z.string().optional(),
    slug: z.string(), // preserves root-flat legacy slug exactly
    valueProp: z.string().optional(),

    // Section 1: Main / Hero Meta Chips
    duration: z.string().default('45-60 Hrs'),
    mode: z.string().default('Online Live Interactive'),
    rating: z.string().default('4.9/5 (1,200+ Reviews)'),
    videoUrl: z.string().optional(), // YouTube embed link / video ID
    courseImage: z.string().optional(), // Media preview placeholder

    // Section 2: Overview & Brochure
    overview: z.string().default(''),
    brochureUrl: z.string().default('https://drive.google.com/'), // Google Drive brochure link

    // Section 3: Course Syllabus Modules
    syllabus: z.array(
      z.object({
        moduleTitle: z.string().optional(),
        module: z.string().optional(), // Legacy compatibility
        topics: z.array(z.string()),
      })
    ).default([]),

    // Section 4: About the Course
    aboutCourse: z.string().default(''),

    // Section 5: Course Objectives
    objectives: z.array(z.string()).default([]),

    // Section 6: Benefits (3 Distinct Containers)
    benefits: z.object({
      basicKnowledge: z.array(z.string()).default([]),
      techSkills: z.array(z.string()).default([]),
      careerInterests: z.array(z.string()).default([]),
    }).default({ basicKnowledge: [], techSkills: [], careerInterests: [] }),

    // Section 7: Why Choose
    whyChoose: z.array(
      z.object({
        title: z.string(),
        description: z.string(),
      })
    ).default([]),

    // Section 8: Eligibility Criteria
    eligibility: z.array(z.string()).default([]),

    // Section 9: Certifications
    certifications: z.object({
      title: z.string().default('Industry-Recognized Certification'),
      description: z.string().default('Earn verified credentials upon capstone project evaluation and practical lab assessments.'),
      badges: z.array(z.string()).default([]),
    }).default({ title: 'Industry-Recognized Certification', description: 'Earn verified credentials upon capstone project evaluation.', badges: [] }),

    // Section 10: Career Opportunities / Job Roles
    jobRoles: z.array(
      z.union([
        z.string(),
        z.object({
          role: z.string(),
          description: z.string(),
          skills: z.array(z.string()).optional(),
          salaryEstimate: z.string().optional(),
        }),
      ])
    ).default([]),

    // Section 11: Trainer Standards & Highlights (Company Standard)
    trainerProfile: z.object({
      heading: z.string().default('Learn from Practicing Enterprise Architects'),
      description: z.string().default('Our instructors are active industry leaders and enterprise consultants with a minimum of 10+ years of production experience.'),
      highlights: z.array(z.string()).default([
        '10+ Years of Enterprise Production Experience',
        'Certified Subject Matter Experts in Consulting Roles',
        'Direct 1-on-1 Sandbox Debugging and Mentorship',
        'Real-world Case Studies & Architecture Reviews',
      ]),
    }).default({
      heading: 'Learn from Practicing Enterprise Architects',
      description: 'Our instructors are active industry leaders and enterprise consultants with a minimum of 10+ years of production experience.',
      highlights: [
        '10+ Years of Enterprise Production Experience',
        'Certified Subject Matter Experts in Consulting Roles',
        'Direct 1-on-1 Sandbox Debugging and Mentorship',
        'Real-world Case Studies & Architecture Reviews',
      ],
    }),

    // Section 12: FAQs
    faqs: z.array(
      z.object({
        question: z.string(),
        answer: z.string(),
      })
    ).default([]),

    // Legacy fields (optional)
    highlights: z.array(z.object({
      icon: z.string(),
      text: z.string(),
    })).optional(),
    batchInfo: z.object({
      format: z.string().optional(),
      startDate: z.string().optional(),
      duration: z.string().optional(),
      timings: z.string().optional(),
    }).optional(),
    seo: z.object({
      metaTitle: z.string().optional(),
      metaDescription: z.string().optional(),
    }).optional(),
    legacyUrl: z.string().url().optional(),
    legacyImpressions: z.number().optional(),
    prerequisites: z.array(z.string()).optional(),
    relatedGuideSlug: z.string().optional(),
  }),
});

const blog = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/blog" }),
  schema: z.object({
    title: z.string(),
    publishDate: z.coerce.date(),
    author: z.string().default('Ask4Trainings Team'),
    category: z.string().default('General'),
    description: z.string(),
    image: z.string().optional(),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
  }),
});

export const collections = { courses, blog };
