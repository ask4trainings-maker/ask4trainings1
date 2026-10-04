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
    duration: z.string().optional().default('45-60 Hrs'),
    mode: z.string().optional().default('Online Live Interactive'),
    rating: z.union([z.string(), z.number()]).transform(val => String(val)).optional(),
    videoUrl: z.string().optional(),          // YouTube embed link / video ID
    courseImage: z.string().optional(),       // Media preview placeholder
    heroImage: z.string().optional(),

    // ─── Section 2: Overview & Brochure ─────────────────────────────────────
    overview: z.string().optional().default(''),
    brochureUrl: z.string().optional().default('https://drive.google.com/'),

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
    aboutCourse: z.string().optional().default(''),

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
          title: z.string().optional(),
          description: z.string().optional(),
        })
      ).optional().default([]),
    }).optional(),

    keyFeatures: z.array(z.object({
      title: z.string().optional(),
      description: z.string().optional(),
    })).optional().default([]),

    // ─── Section 7: Why Choose ──────────────────────────────────────────────
    whyChoose: z.array(
      z.object({
        title: z.string().optional(),
        description: z.string().optional(),
      })
    ).optional().default([]),

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
      title: z.string().optional().default('Industry-Recognized Certification'),
      description: z.string().optional().default('Earn verified credentials upon capstone project evaluation and practical lab assessments.'),
      badges: z.array(z.string()).optional().default([]),
    }).optional().default({ title: 'Industry-Recognized Certification', description: 'Earn verified credentials upon capstone project evaluation.', badges: [] }),

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
        value: z.string().optional(),
        label: z.string().optional(),
      }).nullable().optional(),
      metric2: z.object({
        value: z.string().optional(),
        label: z.string().optional(),
      }).nullable().optional(),
      footerNote: z.string().optional(),
    }).nullable().optional(),

    // ─── Section 10: Career Opportunities / Job Roles ───────────────────────
    jobRoles: z.array(z.any()).optional().default([]),

    // careerInsights — CMS-aligned career data object
    careerInsights: z.any().optional(),


    trainer: z.any().optional(),

    // ─── Section 12: FAQs ───────────────────────────────────────────────────
    faqs: z.array(
      z.object({
        question: z.string().optional(),
        answer: z.string().optional(),
      })
    ).optional().default([]),

    // ─── Pricing ────────────────────────────────────────────────────────────

    // ─── Testimonials ────────────────────────────────────────────────────────
    testimonials: z.array(z.any()).optional(),

    // ─── SEO & Dates ─────────────────────────────────────────────────────────
    keywords: z.array(
      z.union([z.string(), z.object({ keyword: z.string() })])
    ).optional(),

    publishDate: z.preprocess((val) => (val === '' || val === null ? undefined : val), z.coerce.date().optional()),
    updatedDate: z.preprocess((val) => (val === '' || val === null ? undefined : val), z.coerce.date().optional()),



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
  schema: ({ image }) => z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    author: z.string().default('Ask4Trainings Team'),
    tags: z.array(z.string()).default([]),
    image: image().optional(),
    draft: z.boolean().default(false),
    cta: z.object({
      enabled: z.boolean().default(true),
      headline: z.string().default('Need a Demo Session? Let’s Connect'),
      subheadline: z.string().default('Get in touch with our expert advisors to book a free live interactive demo.'),
      enrollUrl: z.string().default('/contact-us/'),
      whatsappMessage: z.string().optional()
    }).optional()
  }),
});

const settings = defineCollection({
  loader: glob({ pattern: "**/*.json", base: "./src/content/settings" }),
  schema: z.object({
    phone: z.string().optional(),
    email: z.string().optional(),
    studentPortalUrl: z.string().optional(),
    whatsappNumber: z.string().optional(),
    enquireMessage: z.string().optional(),
    menuCategories: z.array(z.object({
      key: z.string(),
      label: z.string(),
      description: z.string(),
      featuredCourseSlugs: z.array(z.string()).optional()
    })).optional(),
    summary: z.string().optional(),
    companySummary: z.string().optional(),
    contactInfo: z.object({
      address: z.string(),
      phone: z.string(),
      email: z.string()
    }).optional(),
    popularCourses: z.array(z.object({
      title: z.string(),
      href: z.string()
    })).optional(),
    termsPoliciesLinks: z.array(z.object({
      title: z.string(),
      href: z.string()
    })).optional(),
    socialLinks: z.array(z.object({
      platform: z.string(),
      url: z.string(),
      active: z.boolean().optional()
    })).optional(),
    copyright: z.string().optional()
  })
});

const pages = defineCollection({
  loader: glob({ pattern: "**/*.json", base: "./src/content/pages" }),
  schema: z.object({
    // Home
    hero: z.any().optional(),
    stats: z.any().optional(),
    values: z.any().optional(),
    placement: z.any().optional(),
    metrics: z.any().optional(),
    bento: z.any().optional(),
    roadmap: z.any().optional(),
    conversion: z.any().optional(),
    // About
    mission: z.any().optional(),
    vision: z.any().optional(),
    background: z.any().optional(),
    centerDetails: z.any().optional(),
    leadership: z.any().optional(),
    story: z.any().optional(),
    milestones: z.any().optional(),
    faculty: z.any().optional(),
    infrastructure: z.any().optional(),
    // Contact
    heading: z.string().optional(),
    subhead: z.string().optional(),
    headline: z.string().optional(),
    subheadline: z.string().optional(),
    inquiryNotice: z.string().optional(),
    officeHours: z.string().optional(),
    mapEmbedUrl: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().optional(),
    address: z.string().optional(),
    phoneNumbers: z.any().optional(),
    emailAddresses: z.any().optional(),
    centerAddress: z.any().optional(),
    formHeader: z.string().optional(),
    formSubtext: z.string().optional()
  })
});

const legal = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/legal" }),
  schema: z.object({
    title: z.string(),
    lastUpdated: z.union([z.string(), z.date()]).transform(val => String(val)).optional(),
    description: z.string().optional(),
  })
});

export const collections = { courses, blog, settings, pages, legal };
