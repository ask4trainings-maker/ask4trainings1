import { defineCollection, z } from 'astro:content';
import { glob, file } from 'astro/loaders';

const courses = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/courses" }),
  schema: z.object({
    // ─── Core Metadata (preserved, required fields unchanged) ───────────────
    title: z.string(),
    metaTitle: z.string().optional(),
    metaDescription: z.string().optional(),
    category: z.string().default('other-tools'),
    menuTitle: z.string().optional(),
    slug: z.string(), // preserves root-flat legacy slug exactly
    draft: z.boolean().default(false),
    valueProp: z.string().optional(),
    heroTagline: z.string().optional(),
    navigationPath: z.string().optional(),
    priorityTier: z.string().optional(),
    badge: z.string().optional(),
    body: z.string().optional(),

    // ─── CMS Harmonization: New CMS-aligned aliases (all optional) ──────────
    // navigationLocation is the CMS widget name; navigationPath is the legacy name.
    // Both are accepted so old frontmatter and new CMS-created files both validate.
    navigationLocation: z.string().optional(),

    // shortCode is the CMS widget name; badge is the legacy name.
    shortCode: z.string().optional(),

    // thumbnail / thumbnailAlt — new CMS image widget fields
    thumbnail: z.string().optional(),
    thumbnailAlt: z.string().optional(),

    // permalink — custom override URL
    permalink: z.string().optional(),

    // rating as a number (new CMS) — existing rating is z.string() from legacy.
    // Accept both formats gracefully via coerce.
    ratingNum: z.number().optional(),         // CMS number widget output
    reviewCount: z.number().optional(),        // CMS number widget

    // ─── Section 1: Main / Hero Meta Chips ─────────────────────────────────
    duration: z.string().default('45-60 Hrs'),
    mode: z.string().default('Online Live Interactive'),
    rating: z.union([z.string(), z.number()]).transform(val => String(val)).optional(),
    videoUrl: z.string().optional(),          // YouTube embed link / video ID
    courseImage: z.string().optional(),       // Media preview placeholder
    heroImage: z.string().optional(),

    // ─── Section 2: Overview & Brochure ─────────────────────────────────────
    overview: z.string().default(''),
    brochureUrl: z.string().default('https://drive.google.com/'),

    // brochureDriveUrl — CMS widget name for the same field
    brochureDriveUrl: z.string().optional(),

    // ─── Section 3: Upcoming Batch ──────────────────────────────────────────
    upcomingBatch: z.object({
      startDate: z.string().optional(),
      timing: z.string().optional(),
      seatsLeft: z.string().optional(),
    }).optional(),

    // demoVideoUrl — CMS-named demo video URL field
    demoVideoUrl: z.string().optional(),

    // trainingMode — CMS select widget (Live Online, Classroom, etc.)
    trainingMode: z.string().optional(),

    // scheduleInfo — structured batch object from reference CMS
    scheduleInfo: z.any().optional(),

    // ─── Section 3: Course Syllabus Modules ─────────────────────────────────
    syllabus: z.array(
      z.object({
        moduleTitle: z.string().optional(),
        module: z.string().optional(),       // Legacy compatibility
        moduleMeta: z.string().optional(),
        topics: z.array(z.string()),
      })
    ).default([]),

    // curriculum — CMS-named version of syllabus modules (new courses use this)
    curriculum: z.array(
      z.object({
        moduleTitle: z.string().optional(),
        topics: z.array(
          z.union([
            z.string(),
            z.object({ topic: z.string() }),
          ])
        ).optional(),
      })
    ).optional(),

    // modules — CMS alias for curriculum (duration is optional, auto-computed in UI)
    modules: z.array(
      z.object({
        title: z.string().optional(),
        duration: z.string().optional(), // kept optional for backward-compat; not used in rendering
        topics: z.array(
          z.union([
            z.string(),
            z.object({ topic: z.string() }),
          ])
        ).optional().default([]),
      }).catchall(z.any())
    ).optional().default([]),

    // batches — CMS alias for upcomingBatch / schedule
    batches: z.array(z.record(z.string(), z.any())).optional().default([]),

    // ─── Section 4: About the Course ────────────────────────────────────────
    aboutCourse: z.string().default(''),

    // description — short hero summary (CMS-aligned, max 160 chars guideline)
    description: z.string().optional(),

    // ─── Section 5: Course Objectives ───────────────────────────────────────
    // Accepts plain strings (legacy) or {item: string} objects from CMS list widget
    objectives: z.array(
      z.union([
        z.string(),
        z.object({ item: z.string() }),
        z.record(z.string(), z.any()), // catch-all for other CMS shapes
      ])
    ).default([]),

    // ─── Section 6: Benefits (3 Distinct Containers) ────────────────────────
    // Each sub-array accepts strings (legacy) or {item: string} objects (CMS widget)
    benefits: z.union([
      z.object({
        basicKnowledge: z.array(
          z.union([z.string(), z.record(z.string(), z.any())])
        ).default([]),
        techSkills: z.array(
          z.union([z.string(), z.record(z.string(), z.any())])
        ).default([]),
        careerInterests: z.array(
          z.union([z.string(), z.record(z.string(), z.any())])
        ).default([]),
      }),
      z.array(z.record(z.string(), z.any()))
    ]).default([]),

    // ─── Section 6b: Why Master This Course ─────────────────────────────────
    whyMaster: z.object({
      title: z.string().optional(),
      description: z.string().optional(),
      pillars: z.array(
        z.object({
          title: z.string(),
          description: z.string(),
        })
      ).optional().default([]),
    }).optional(),

    keyFeatures: z.array(z.object({
      title: z.string(),
      description: z.string(),
    })).optional().default([]),

    // ─── Section 7: Why Choose ──────────────────────────────────────────────
    whyChoose: z.array(
      z.object({
        title: z.string(),
        description: z.string(),
      })
    ).default([]),

    // whyChooseUs — CMS-aligned name (harmonization alias)
    whyChooseUs: z.array(z.any()).optional(),

    // ─── Section 8: Eligibility Criteria ────────────────────────────────────
    // Legacy: array of strings. CMS: array of Q&A objects. Accept both.
    eligibility: z.union([
      z.array(z.string()),
      z.array(z.object({
        question: z.string().optional(),
        title: z.string().optional(),
        answer: z.string().optional(),
      })),
    ]).default([]),

    // whoShouldEnroll — normalized CMS field (title + description objects)
    // Accepts string arrays, or objects with any keys (title/description/answer/question)
    whoShouldEnroll: z.array(
      z.union([
        z.record(z.string(), z.any()), // any object shape (title+description, title+answer, etc)
        z.string(),
      ])
    ).optional().default([]),

    // prerequisites — extended to accept both string arrays (legacy) and object arrays (CMS)
    prerequisites: z.array(z.string()).optional(),

    // ─── Section 9: Certifications ──────────────────────────────────────────
    certifications: z.object({
      title: z.string().default('Industry-Recognized Certification'),
      description: z.string().default('Earn verified credentials upon capstone project evaluation and practical lab assessments.'),
      badges: z.array(z.string()).default([]),
    }).default({ title: 'Industry-Recognized Certification', description: 'Earn verified credentials upon capstone project evaluation.', badges: [] }),

    // certification — XML extracted string or object
    certification: z.object({
      title: z.string().optional().default("Industry Recognized Certification"),
      description: z.string().optional().default(""),
    }).optional(),

    whyChooseCourse: z.string().optional(),

    roiMetrics: z.object({
      headline: z.string().optional(),
      badge: z.string().optional(),
      metric1: z.object({
        value: z.string(),
        label: z.string(),
      }).optional(),
      metric2: z.object({
        value: z.string(),
        label: z.string(),
      }).optional(),
      footerNote: z.string().optional(),
    }).optional(),

    // ─── Section 10: Career Opportunities / Job Roles ───────────────────────
    jobRoles: z.array(z.any()).optional().default([]),

    // careerInsights — CMS-aligned career data object
    careerInsights: z.any().optional(),


    trainer: z.any().optional(),

    // ─── Section 12: FAQs ───────────────────────────────────────────────────
    faqs: z.array(
      z.object({
        question: z.string(),
        answer: z.string(),
      })
    ).default([]),

    // ─── Pricing ────────────────────────────────────────────────────────────

    // ─── Testimonials ────────────────────────────────────────────────────────
    testimonials: z.array(z.any()).optional(),

    // ─── SEO & Dates ─────────────────────────────────────────────────────────
    keywords: z.array(
      z.union([z.string(), z.object({ keyword: z.string() })])
    ).optional(),

    publishDate: z.coerce.date().optional(),
    updatedDate: z.coerce.date().optional(),



    // ─── Related Courses ──────────────────────────────────────────────────────
    relatedCourseSlugs: z.array(z.string()).optional(),
    relatedGuideSlug: z.string().optional(),

    // ─── Batch Info ──────────────────────────────────────────────────────────
    // batchInfo is kept as the object shape — components access .duration/.format
    batchInfo: z.any().optional(),
    // batchInfoText — CMS free-form string (new courses from CMS use this instead)
    batchInfoText: z.string().optional(),

    // ─── Legacy SEO Wrapper ──────────────────────────────────────────────────
    seo: z.object({
      metaTitle: z.string().optional(),
      metaDescription: z.string().optional(),
    }).optional(),


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
    // CMS-aligned additions (optional)
    imageAlt: z.string().optional(),
    metaDescription: z.string().optional(),
    updatedDate: z.coerce.date().optional(),
    legacyUrl: z.string().optional(),
    relatedCourseSlug: z.string().optional(),
    navigation_path: z.string().optional(),
  }),
});

export const collections = { courses, blog };
