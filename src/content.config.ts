import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

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
    valueProp: z.string().optional(),
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
    rating: z.string().default('4.9/5 (1,200+ Reviews)'),
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
    scheduleInfo: z.object({
      duration: z.string().optional(),
      upcomingBatch: z.string().optional(),
      modes: z.string().optional(),
    }).optional(),

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

    // ─── Section 4: About the Course ────────────────────────────────────────
    aboutCourse: z.string().default(''),

    // description — short hero summary (CMS-aligned, max 160 chars guideline)
    description: z.string().optional(),

    // ─── Section 5: Course Objectives ───────────────────────────────────────
    objectives: z.array(z.string()).default([]),

    // ─── Section 6: Benefits (3 Distinct Containers) ────────────────────────
    benefits: z.object({
      basicKnowledge: z.array(z.string()).default([]),
      techSkills: z.array(z.string()).default([]),
      careerInterests: z.array(z.string()).default([]),
    }).default({ basicKnowledge: [], techSkills: [], careerInterests: [] }),

    // ─── Section 7: Why Choose ──────────────────────────────────────────────
    whyChoose: z.array(
      z.object({
        title: z.string(),
        description: z.string(),
      })
    ).default([]),

    // whyChooseUs — CMS-aligned name (harmonization alias)
    whyChooseUs: z.array(
      z.object({
        title: z.string().optional(),
        description: z.string().optional(),
      })
    ).optional(),

    // ─── Section 8: Eligibility Criteria ────────────────────────────────────
    // Legacy: array of strings. CMS: array of Q&A objects. Accept both.
    eligibility: z.union([
      z.array(z.string()),
      z.array(z.object({
        question: z.string(),
        answer: z.string(),
      })),
    ]).default([]),

    // targetAudience — CMS-aligned audience field
    targetAudience: z.array(
      z.union([
        z.string(),
        z.object({ audience: z.string() }),
      ])
    ).optional(),

    // prerequisites — extended to accept both string arrays (legacy) and object arrays (CMS)
    prerequisites: z.array(z.string()).optional(),

    // ─── Section 9: Certifications ──────────────────────────────────────────
    certifications: z.object({
      title: z.string().default('Industry-Recognized Certification'),
      description: z.string().default('Earn verified credentials upon capstone project evaluation and practical lab assessments.'),
      badges: z.array(z.string()).default([]),
    }).default({ title: 'Industry-Recognized Certification', description: 'Earn verified credentials upon capstone project evaluation.', badges: [] }),

    // certification — CMS simple string field (new courses)
    certification: z.string().optional(),

    // ─── Section 10: Career Opportunities / Job Roles ───────────────────────
    jobRoles: z.array(
      z.union([
        z.string(),
        z.object({
          role: z.string(),
          description: z.string().optional(),
          skills: z.array(z.string()).optional(),
          salaryEstimate: z.string().optional(),
        }),
      ])
    ).default([]),

    // careerInsights — CMS-aligned career data object
    careerInsights: z.object({
      avgSalary: z.string().optional(),
      jobRoles: z.array(
        z.union([z.string(), z.object({ role: z.string() })])
      ).optional(),
      hiringIndustries: z.string().optional(),
    }).optional(),

    // ─── Section 11: Trainer Profile ────────────────────────────────────────
    // Legacy shape (company standard) + CMS shape (per-course trainer). Accept both.
    trainerProfile: z.union([
      // Legacy company-standard shape
      z.object({
        heading: z.string().optional(),
        description: z.string().optional(),
        highlights: z.array(z.string()).optional(),
      }),
      // CMS per-course shape
      z.object({
        name: z.string().optional(),
        role: z.string().optional(),
        experience: z.string().optional(),
        title: z.string().optional(),
        bio: z.string().optional(),
        highlights: z.array(
          z.union([z.string(), z.object({ highlight: z.string() })])
        ).optional(),
        avatarImage: z.string().optional(),
        avatarImageAlt: z.string().optional(),
      }),
    ]).optional(),

    // ─── Section 12: FAQs ───────────────────────────────────────────────────
    faqs: z.array(
      z.object({
        question: z.string(),
        answer: z.string(),
      })
    ).default([]),

    // ─── Pricing ────────────────────────────────────────────────────────────
    // pricingTiers — new CMS pricing format
    pricingTiers: z.array(
      z.object({
        planName: z.string().optional(),
        price: z.string().optional(),
        features: z.array(
          z.union([z.string(), z.object({ feature: z.string().optional() })])
        ).optional(),
      })
    ).optional(),

    // pricingPlans — legacy pricing format
    pricingPlans: z.array(
      z.object({
        planName: z.string().optional(),
        tagline: z.string().optional(),
        isFeatured: z.boolean().optional(),
        ctaText: z.string().optional(),
        features: z.array(
          z.object({
            text: z.string().optional(),
            included: z.boolean().optional(),
          })
        ).optional(),
      })
    ).optional(),

    // ─── Testimonials ────────────────────────────────────────────────────────
    testimonials: z.array(
      z.object({
        studentName: z.string().optional(),
        placedCompany: z.string().optional(),
        quote: z.string().optional(),
        rating: z.number().optional(),
        videoUrl: z.string().optional(),
      })
    ).optional(),

    // ─── Key Features ────────────────────────────────────────────────────────
    keyFeatures: z.array(
      z.object({
        iconName: z.string().optional(),
        title: z.string().optional(),
        description: z.string().optional(),
      })
    ).optional(),

    // ─── Highlights ─────────────────────────────────────────────────────────
    // Accept string list (CMS), icon+text objects (legacy), or item objects (legacy alt)
    highlights: z.union([
      z.array(z.string()),
      z.array(z.object({ icon: z.string(), text: z.string() })),
      z.array(z.object({ item: z.string() })),
      z.array(z.object({ highlight: z.string() })),
    ]).optional(),

    // ─── SEO & Dates ─────────────────────────────────────────────────────────
    keywords: z.array(
      z.union([z.string(), z.object({ keyword: z.string() })])
    ).optional(),

    publishDate: z.coerce.date().optional(),
    updatedDate: z.coerce.date().optional(),

    // ─── Legacy Media ────────────────────────────────────────────────────────
    media: z.object({
      heroImage: z.string().optional(),
      youtubeVideoId: z.string().optional(),
    }).optional(),

    // ─── Related Courses ──────────────────────────────────────────────────────
    relatedCourseSlugs: z.array(z.string()).optional(),
    relatedGuideSlug: z.string().optional(),

    // ─── Batch Info ──────────────────────────────────────────────────────────
    // batchInfo is kept as the object shape — components access .duration/.format
    batchInfo: z.object({
      type: z.string().optional(),
      mode: z.string().optional(),
      format: z.string().optional(),
      startDate: z.string().optional(),
      duration: z.string().optional(),
      timings: z.string().optional(),
    }).optional(),
    // batchInfoText — CMS free-form string (new courses from CMS use this instead)
    batchInfoText: z.string().optional(),

    // ─── Legacy SEO Wrapper ──────────────────────────────────────────────────
    seo: z.object({
      metaTitle: z.string().optional(),
      metaDescription: z.string().optional(),
    }).optional(),

    // ─── Other Legacy Fields ─────────────────────────────────────────────────
    legacyUrl: z.string().optional(),         // relaxed from .url() to allow non-http legacy paths
    legacyImpressions: z.number().optional(),
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
