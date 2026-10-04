export function getOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": ["EducationalOrganization", "LocalBusiness"],
    "name": "Ask4Trainings",
    "url": "https://ask4trainings.com",
    "logo": "https://ask4trainings.com/logo.svg",
    "description": "Enterprise software and IT training institute.",
    "telephone": "+918099949888",
    "email": "ask4trainings@gmail.com",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Hyderabad",
      "addressRegion": "Telangana",
      "addressCountry": "IN"
    },
    "sameAs": [
      "https://www.linkedin.com/company/ask4trainings/",
      "https://www.youtube.com/@ask4trainings",
      "https://twitter.com/ask4trainings",
      "https://www.facebook.com/ask4trainings",
      "https://www.instagram.com/ask4trainings/"
    ]
  };
}

export function getCourseSchema(course: any) {
  return {
    "@context": "https://schema.org",
    "@type": "Course",
    "name": course.title || course.name,
    "description": course.metaDescription || course.description || course.overview,
    "provider": {
      "@type": "EducationalOrganization",
      "name": "Ask4Trainings",
      "url": "https://ask4trainings.com"
    },
    "hasCourseInstance": {
      "@type": "CourseInstance",
      "courseMode": ["Online", "Blended"],
      "courseWorkload": course.duration || "PT45H"
    },
    "educationalCredentialAwarded": course.title || course.name
  };
}

export function getFaqSchema(faqs: any[]) {
  if (!faqs || faqs.length === 0) return null;
  const validFaqs = faqs.filter(f => f.question && f.answer);
  if (validFaqs.length === 0) return null;

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": validFaqs.map(item => ({
      "@type": "Question",
      "name": item.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": item.answer
      }
    }))
  };
}

export function getBreadcrumbSchema(steps: { name: string, path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": steps.map((step, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": step.name,
      "item": step.path
    }))
  };
}

export function getBlogPostingSchema(post: any, siteUrl: string) {
  const postUrl = new URL(`/blog/${post.slug}/`, siteUrl).toString();
  const pubDate = post.data.pubDate || post.data.publishDate;
  const modDate = post.data.updatedDate || pubDate;
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": post.data.title,
    "description": post.data.excerpt || post.data.metaDescription,
    "image": post.data.image ? post.data.image : `${siteUrl}/logo.svg`,
    "datePublished": new Date(pubDate).toISOString(),
    "dateModified": new Date(modDate).toISOString(),
    "author": {
      "@type": "Organization",
      "name": "Ask4Trainings Editorial Team"
    },
    "publisher": {
      "@type": "Organization",
      "name": "Ask4Trainings",
      "logo": {
        "@type": "ImageObject",
        "url": `${siteUrl}/logo.svg`
      }
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": postUrl
    }
  };
}
