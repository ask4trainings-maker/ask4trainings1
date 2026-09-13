import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const courses = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/courses" }),
  schema: z.object({
    title: z.string(),
    menuTitle: z.string().optional(),
    slug: z.string(), // preserves root-flat legacy slug exactly
    category: z.enum([
      'guidewire', 'siemens', 'new-courses', 'cloud-computing',
      'oracle', 'devops', 'development', 'ms-d365',
      'sap', 'trending-courses', 'other-tools',
    ]),
    valueProp: z.string().max(160),
    highlights: z.array(z.object({
      icon: z.string(),
      text: z.string().max(60),
    })).min(3).max(4),
    syllabus: z.array(z.object({
      module: z.string(),
      topics: z.array(z.string()),
    })),
    prerequisites: z.array(z.string()).optional(),
    batchInfo: z.object({
      format: z.enum(['Online', 'Classroom', 'Hybrid']),
      startDate: z.string().optional(),
      duration: z.string(),
      timings: z.string().optional(),
    }),
    faqs: z.array(z.object({
      question: z.string(),
      answer: z.string(),
    })).optional(),
    relatedGuideSlug: z.string().optional(),
    seo: z.object({
      metaTitle: z.string().max(60),
      metaDescription: z.string().max(160),
    }),
    // migration provenance — retained for audit trail, not rendered
    legacyUrl: z.string().url().optional(),
    legacyImpressions: z.number().optional(),
  }),
});

const blog = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/blog" }),
  schema: z.object({
    title: z.string(),
    publishDate: z.date(),
    category: z.string(),
    heroImage: z.string().optional(),
    relatedCourseSlug: z.string().optional(),
    ctaHubSlug: z.string().optional(),
    seo: z.object({
      metaTitle: z.string().max(60),
      metaDescription: z.string().max(160),
    }),
  }),
});

export const collections = { courses, blog };
