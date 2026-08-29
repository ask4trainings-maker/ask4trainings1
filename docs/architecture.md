# Technical Architecture & Implementation Spec
## Ask 4 Trainings Website Rebuild

**Version:** 1.0
**Sister Project:** Hope InfoTech (same lead-capture/WhatsApp pattern, distinct CMS choice — Sveltia over Decap — and distinct redirect inventory)

---

## 1. System Architecture Overview

### 1a. Build Time — Astro SSG + Pagefind

```
┌──────────────────┐     git push      ┌───────────────────────┐
│  Sveltia CMS      │ ───────────────▶ │   GitHub Repository    │
│  (/admin SPA)      │                  │  src/content/*.md      │
└──────────────────┘                  └───────────┬────────────┘
                                                     │ webhook
                                                     ▼
                                        ┌───────────────────────┐
                                        │  Cloudflare Pages CI   │
                                        │  1. astro build (SSG)  │
                                        │  2. pagefind --site dist│
                                        │  3. deploy to CDN edge  │
                                        └───────────┬────────────┘
                                                     ▼
                                        ┌───────────────────────┐
                                        │  Cloudflare global CDN │
                                        │  (static HTML/CSS/JS)  │
                                        └───────────────────────┘
```

### 1b. Runtime — Visitor Request Flow

```
Visitor ──▶ Cloudflare Edge (static HTML, 0KB baseline JS)
              │
              ├──▶ Enquiry form submit
              │       fetch(APPS_SCRIPT_URL, {mode:'no-cors', body: text/plain})
              │       ──▶ Google Apps Script Web App
              │              ├──▶ appends row to "Website-Enquiry" Sheet
              │              └──▶ MailApp.sendEmail → ask4trainings@gmail.com
              │
              ├──▶ WhatsApp CTA click
              │       ──▶ https://wa.me/918099949888?text=Hi%20Ask4Trainings...
              │       (lightweight click event, no lead record)
              │
              └──▶ Search modal open (first interaction only)
                      ──▶ lazy-load Pagefind WASM bundle
```

### 1c. Content Editing — Sveltia CMS + Cloudflare Worker OAuth Proxy

```
┌──────────────┐   1. login   ┌─────────────────────────┐   2. OAuth   ┌────────────┐
│ Client staff  │ ───────────▶│ Cloudflare Worker (proxy)│ ───────────▶│  GitHub    │
│  /admin (SPA) │◀─────────── │  exchanges code → token   │◀─────────── │  OAuth App │
└──────────────┘   3. token   └─────────────────────────┘  4. token    └────────────┘
        │
        │ 5. authenticated git operations (read/write content files)
        ▼
┌───────────────────────┐
│  GitHub Repository     │ ──▶ triggers Cloudflare Pages rebuild on commit
└───────────────────────┘
```

The Worker proxy exists solely because GitHub's OAuth flow requires a confidential client secret, which cannot live in a static SPA. This is the one piece of "server" in the entire stack, and it runs on Cloudflare's free Workers tier — $0 recurring cost preserved.

---

## 2. Directory Structure

```
ask4trainings/
├── astro.config.mjs
├── tailwind.config.mjs
├── package.json
├── public/
│   ├── _redirects                  # Full 301 map — see Section 6
│   ├── favicon.svg
│   └── robots.txt
├── admin/
│   ├── index.html                  # Sveltia CMS mount point
│   └── config.yml                  # Collections, fields, backend config
├── functions/                      # Cloudflare Pages Functions
│   └── oauth/
│       ├── auth.js                 # Worker: GitHub OAuth step 1
│       └── callback.js             # Worker: GitHub OAuth step 2 (token exchange)
├── apps-script/
│   └── enquiry-handler.gs          # Deployed separately as a GAS Web App
├── src/
│   ├── content/
│   │   ├── config.ts                # Zod collection schemas
│   │   ├── courses/                 # ~90 course landing pages (.md)
│   │   ├── blog/                    # Guide/blog articles (.md)
│   │   └── categories/
│   │       └── categories.json      # 11 hub intro copy blocks
│   ├── layouts/
│   │   ├── CourseLayout.astro
│   │   ├── BlogLayout.astro
│   │   └── HubLayout.astro
│   ├── components/
│   │   ├── EnquiryForm.astro
│   │   ├── WhatsAppCTA.astro
│   │   ├── MegaMenu.astro
│   │   ├── CourseCard.astro
│   │   ├── SyllabusAccordion.astro
│   │   └── SearchModal.astro
│   ├── pages/
│   │   ├── index.astro
│   │   ├── about-us.astro
│   │   ├── contact-us.astro
│   │   ├── [slug].astro             # Root-flat course landing route
│   │   ├── blog/
│   │   │   ├── index.astro
│   │   │   └── [slug].astro
│   │   └── [category]/
│   │       └── index.astro          # 11 category hub routes
│   └── data/
│       └── mega-menu.json           # 11-category taxonomy, Section 6 of PRD.md
└── scripts/
    └── generate-sitemap.mjs
```

---

## 3. Content Collection Schemas (`src/content/config.ts`)

```typescript
import { defineCollection, z } from 'astro:content';

const courses = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
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
    legacyUrl: z.string().url(),
    legacyImpressions: z.number().optional(),
  }),
});

const blog = defineCollection({
  type: 'content',
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
```

`categories.json` (data collection, validated ad hoc rather than through the content-collection loader since it's a single fixed-shape file):

```json
{
  "guidewire": { "label": "Guidewire", "intro": "…", "careerOpportunities": "…" },
  "siemens": { "label": "Siemens", "intro": "…", "careerOpportunities": "…" }
}
```
*(11 entries total, one per mega-menu category — see PRD.md Section 6.)*

---

## 4. Google Apps Script Backend (`apps-script/enquiry-handler.gs`)

```javascript
const SHEET_NAME = 'Website-Enquiry';
const ALERT_EMAIL = 'ask4trainings@gmail.com';

function doPost(e) {
  try {
    const data = parsePayload(e.postData.contents);
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);

    sheet.appendRow([
      new Date(),
      data.name || '',
      data.phone || '',
      data.email || '',
      data.course || '',
      data.message || '',
      data.sourcePage || '',
    ]);

    MailApp.sendEmail({
      to: ALERT_EMAIL,
      subject: `New Enquiry: ${data.course || 'General'} — ${data.name || 'Unknown'}`,
      body:
        `Name: ${data.name}\n` +
        `Phone: ${data.phone}\n` +
        `Email: ${data.email}\n` +
        `Course: ${data.course}\n` +
        `Message: ${data.message}\n` +
        `Source: ${data.sourcePage}\n` +
        `Time: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`,
    });

    return ContentService.createTextOutput('OK');
  } catch (err) {
    // Fail silently to the client (fire-and-forget, see architecture note below)
    // but log server-side for manual recovery.
    console.error(err);
    return ContentService.createTextOutput('ERROR');
  }
}

// The client sends text/plain (not application/json) to keep the request
// a "simple request" under CORS — this avoids a preflight OPTIONS call,
// which Apps Script Web Apps do not handle. The payload is JSON-encoded
// text, parsed manually here.
function parsePayload(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}
```

Deployment: **Deploy → New deployment → Web app**, execute as *Me*, access to *Anyone*. The resulting `/exec` URL is the `APPS_SCRIPT_URL` referenced client-side.

---

## 5. Client-Side Form Handler (`src/components/EnquiryForm.astro`)

```astro
---
export interface Props {
  sourcePage: string;
  courseName?: string;
}
const { sourcePage, courseName } = Astro.props;
---
<form id="enquiry-form" data-source={sourcePage} data-course={courseName ?? ''}>
  <label for="name">Name</label>
  <input id="name" name="name" required />

  <label for="phone">Phone</label>
  <input id="phone" name="phone" type="tel" required />

  <label for="email">Email</label>
  <input id="email" name="email" type="email" required />

  <input type="hidden" name="course" value={courseName ?? ''} />

  <button type="submit">Enquire Now</button>
  <p id="form-status" role="status" aria-live="polite"></p>
</form>

<script>
  const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycb.../exec';

  const form = document.getElementById('enquiry-form') as HTMLFormElement;
  const status = document.getElementById('form-status')!;

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const payload = {
      name: fd.get('name'),
      phone: fd.get('phone'),
      email: fd.get('email'),
      course: fd.get('course'),
      message: fd.get('message') ?? '',
      sourcePage: form.dataset.source,
    };

    // mode: 'no-cors' means the response body is opaque — we cannot read
    // success/failure from it. This is the fire-and-forget trade-off noted
    // in PRD.md Section 9: the UI shows an optimistic success state as soon
    // as the request is dispatched, not once it's confirmed delivered.
    try {
      await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload),
      });
      status.textContent = "Thanks — we'll reach out shortly.";
      form.reset();
    } catch {
      status.textContent = 'Something went wrong. Please WhatsApp us instead.';
    }
  });
</script>
```

---

## 6. `public/_redirects` — Full 301 Map

Derived line-by-line from the 114-row `Ask4Trainings_URL_Migration_Map_-_Master_Migration.csv`. Rows not listed here (~72 URLs) are rebuilt as live Astro routes at their existing legacy slug — no redirect needed. One row (`/wp-content/uploads/.../servicenow-course.jpeg`) was already a 404 in the crawl and is excluded.

```
# ── Duplicate/near-duplicate course pairs — consolidated to the
# ── higher-impressions URL as canonical ─────────────────────────
/teamcenter-plm-training/                              /teamcenter-plm-training-online/                          301
/servicenow-csm-training-in-hyderabad/                 /servicenow-csm-training/                                  301
/sap-c4c-course-in-hyderabad/                          /sap-c4c-online-training/                                  301
/salesforce-cpq-advanced-training/                     /salesforce-cpq-online-training/                           301
/best-salesforce-cpq-training-in-hyderabad/            /salesforce-cpq-online-training/                           301
/sap-ariba-course-in-hyderabad/                        /sap-ariba-online-training/                                301
/best-sap-cpi-training-in-hyderabad/                   /sap-cpi-online-training/                                  301
/sap-successfactors-training-in-hyderabad/             /sap-successfactors-online-training/                       301
/snowflake-training-in-hyderabad/                      /snowflake-online-training/                                301
/sap-fico-s4-hana-training-in-hyderabad/               /sap-ficos4-hana-training/                                 301
/best-sap-fico-training-in-hyderabad/                  /sap-ficos4-hana-training/                                 301
/best-guidewire-rating-online-training/                /guidewire-rating-management-online-training/              301
/sap-brim-course-in-hyderabad/                         /sap-brim-online-training/                                 301
/sap-sd-course/                                        /best-sap-sd-training-in-hyderabad/                        301
/sap-sd-course-in-hyderabad/                           /best-sap-sd-training-in-hyderabad/                        301
/sap-basis-online-training/                            /best-sap-basis-training-in-hyderabad/                     301
/sap-abap-on-hana-online-training/                     /best-sap-abap-on-hana-training-in-hyderabad/              301
/sap-transportation-management-training-in-hyderabad/  /sap-tm-online-training/                                   301
/sailpoint-iiq-online-training/                        /sailpoint-identityiq-training-in-hyderabad/               301
/sailpoint-online-training/                            /sailpoint-identityiq-training-in-hyderabad/               301
/guidewire-testing-training/                           /guidewire-automation-testing-on-gt-frameworks/            301
/guidewire-testing-stlf-online-training/                /guidewire-automation-testing-on-gt-frameworks/            301

# ── Orphaned GSC URLs (Not in Crawl) → nearest live equivalent ──
/guidewire-online-training/                            /guidewire-courses/                                        301
/guidewire-training-in-hyderabad/                       /guidewire-courses/                                        301
/course-tag/guidewire-development-online-training/      /guidewire-courses/                                        301
/student-registration/                                  /contact-us/                                               301
/courses/guidewire-testing/lesson/policy-transactions-lob1/  /guidewire-automation-testing-on-gt-frameworks/       301

# ── Legacy WordPress taxonomy → category hub or homepage ────────
/category/servicenow/                                   /trending-courses/                                         301
/category/polarion/                                      /polarion-online-training/                                301
/category/teamcenter/                                    /siemens-courses/                                          301
/category/guidewire-development/                         /guidewire-courses/                                        301
/category/guidewire/                                      /guidewire-courses/                                        301
/category/guidewire-frameworks/                           /guidewire-courses/                                        301
/category/uncategorized/                                  /                                                          301
/category/uncategorized/page/2/                            /                                                          301

# ── Legacy listing/author/events pages → homepage ────────────────
/courses/                                                 /                                                          301
/course-list/                                             /                                                          301
/home/database/                                            /                                                          301
/events/                                                    /                                                          301
/events/list/*                                              /                                                          301
/author/admin/                                              /                                                          301
/author/admin/page/2/                                        /                                                          301
/author/admin/page/3/                                         /                                                          301
```

QA checklist for Phase 3 (Section 10 of PRD.md): run the Screaming Frog crawl against staging with this file live, confirm all 114 audited URLs return either `200` (rebuilt route) or a single-hop `301` to a `200` — zero redirect chains, zero unmapped `404`s.

---

## 7. Sveltia CMS Configuration (`admin/config.yml`)

```yaml
backend:
  name: github
  repo: ask4trainings/website
  branch: main
  base_url: https://ask4trainings-oauth.<worker-subdomain>.workers.dev
  auth_endpoint: oauth/auth

media_folder: "public/images/uploads"
public_folder: "/images/uploads"

collections:
  - name: courses
    label: "Course Landing Pages"
    folder: "src/content/courses"
    create: true
    slug: "{{fields.slug}}"
    fields:
      - { label: "Title", name: "title", widget: string }
      - { label: "URL Slug", name: "slug", widget: string, hint: "Must match the legacy URL exactly for migrated pages — do not change without updating _redirects." }
      - label: "Category"
        name: "category"
        widget: select
        options:
          [guidewire, siemens, new-courses, cloud-computing, oracle,
           devops, development, ms-d365, sap, trending-courses, other-tools]
      - { label: "One-line Value Prop", name: "valueProp", widget: string }
      - label: "Highlights"
        name: "highlights"
        widget: list
        min: 3
        max: 4
        fields:
          - { label: "Icon", name: "icon", widget: string }
          - { label: "Text", name: "text", widget: string }
      - label: "Syllabus"
        name: "syllabus"
        widget: list
        fields:
          - { label: "Module", name: "module", widget: string }
          - { label: "Topics", name: "topics", widget: list }
      - { label: "Prerequisites", name: "prerequisites", widget: list, required: false }
      - label: "Batch Info"
        name: "batchInfo"
        widget: object
        fields:
          - { label: "Format", name: "format", widget: select, options: [Online, Classroom, Hybrid] }
          - { label: "Start Date", name: "startDate", widget: string, required: false }
          - { label: "Duration", name: "duration", widget: string }
      - { label: "Related Guide Slug", name: "relatedGuideSlug", widget: string, required: false }
      - { label: "Body", name: "body", widget: markdown }

  - name: blog
    label: "Blog / Guide Articles"
    folder: "src/content/blog"
    create: true
    slug: "{{slug}}"
    fields:
      - { label: "Title", name: "title", widget: string }
      - { label: "Publish Date", name: "publishDate", widget: datetime }
      - { label: "Hero Image", name: "heroImage", widget: image, required: false, hint: "1200×630px recommended." }
      - { label: "Related Course Slug", name: "relatedCourseSlug", widget: string, required: false }
      - { label: "Body", name: "body", widget: markdown }

  - name: categories
    label: "Category Hub Pages"
    files:
      - name: hubs
        label: "11 Category Hubs"
        file: "src/content/categories/categories.json"
        fields:
          - label: "Categories"
            name: "categories"
            widget: list
            fields:
              - { label: "Key", name: "key", widget: string }
              - { label: "Label", name: "label", widget: string }
              - { label: "Intro (2 paragraphs)", name: "intro", widget: text }
              - { label: "Career Opportunities", name: "careerOpportunities", widget: text }
```

`admin/index.html`:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Ask 4 Trainings — Content Admin</title>
  <script src="https://unpkg.com/@sveltia/cms/dist/sveltia-cms.js" type="module"></script>
</head>
<body></body>
</html>
```

---

## 8. Cloudflare Worker OAuth Proxy (`functions/oauth/auth.js`, `callback.js`)

Standard two-step GitHub OAuth exchange, matching the shape Decap/Sveltia both expect:

```javascript
// functions/oauth/auth.js — redirects to GitHub's authorize URL
export async function onRequest({ env }) {
  const url = new URL('https://github.com/login/oauth/authorize');
  url.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
  url.searchParams.set('scope', 'repo,user');
  return Response.redirect(url.toString(), 302);
}
```

```javascript
// functions/oauth/callback.js — exchanges the code for a token,
// then posts it back to the CMS window via postMessage per the
// Decap/Sveltia OAuth handshake convention.
export async function onRequest({ request, env }) {
  const code = new URL(request.url).searchParams.get('code');
  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
    }),
  });
  const { access_token } = await tokenRes.json();

  const html = `<script>
    (function() {
      function receiveMessage() {
        window.opener.postMessage(
          'authorization:github:success:${JSON.stringify({ token: access_token })}',
          '*'
        );
        window.removeEventListener('message', receiveMessage, false);
      }
      window.addEventListener('message', receiveMessage, false);
      window.opener.postMessage('authorizing:github', '*');
    })();
  </script>`;

  return new Response(html, { headers: { 'Content-Type': 'text/html' } });
}
```

`GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` are set as Cloudflare Pages environment secrets, never committed to the repo.

---

## 9. Phase 2 Forward-Compatibility Notes (LMS, not built now)

The Phase 1 architecture deliberately avoids choices that would block Phase 2:

- **Video (Bunny.net Stream):** course content collection already separates `syllabus` (structured, public) from body content, so a future `lessons` collection with signed Bunny.net playback URLs can attach to a course without restructuring existing course files.
- **Auth/Enrollment (Supabase):** Phase 1 has zero server-side auth. Supabase's free-tier Postgres + Auth can be introduced as an isolated addition (its own client SDK, its own tables) without touching the static course/blog content pipeline.
- **Payments (Razorpay):** no payment surface exists in Phase 1; the enquiry form intentionally collects interest, not payment, keeping Razorpay integration a clean Phase 2 addition rather than a retrofit.

None of this is built, scaffolded, or stubbed in Phase 1 — it is noted here only so Phase 1 choices don't have to be undone later.
