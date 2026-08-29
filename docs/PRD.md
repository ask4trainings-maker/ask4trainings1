# Product Requirements Document
## Ask 4 Trainings Website Rebuild

**Version:** 1.0
**Status:** Approved for build
**Client:** Ask 4 Trainings Consultancy, Ameerpet, Hyderabad
**Sister Project:** Hope InfoTech (same parent training institute — shared architecture pattern, distinct brand/content)
**Prepared for:** Handoff to non-technical client team after launch

---

## 1. Executive Summary

Ask 4 Trainings' current website (`https://ask4trainings.com`) runs on WordPress + Elementor on a shared server hosting 10+ other client sites, causing CPU/RAM contention, high Time to First Byte, and gateway timeouts under load. Page weight exceeds 2MB per page (worse than the Hope InfoTech baseline of 1.5MB+), Core Web Vitals are poor, and broken/off-domain lead redirects are actively costing the business qualified enquiries.

This project rebuilds the site as a static, edge-hosted Astro application with two independently editable content systems suited to a 100% non-technical client team, while preserving the SEO equity accumulated across 114 audited URLs (Google Search Console + Screaming Frog crawl).

**This is a freelance engagement. The client cannot write or read code.** Every decision below is filtered through that constraint — content editing, deployment, and lead capture are all designed around "no code, no server, no CLI" from the client's side, consistent with the Hope InfoTech engagement but re-validated independently for this client's own content, taxonomy, and traffic profile.

---

## 2. Goals & Quantifiable Metrics

| Goal | Success Metric |
|---|---|
| Fix Core Web Vitals | LCP < 1.5s, CLS < 0.1, FCP < 1.8s on 4G mobile (tighter than Hope InfoTech's 2.5s target, reflecting the larger current page-weight regression) |
| Reduce page weight | < 200KB per page (excl. images), < 15KB production CSS |
| Zero broken URLs | All 114 audited URLs resolve — either as a live route or a verified 301 — with 0 unmapped 404s at launch |
| Preserve SEO equity | No net loss in indexed pages, impressions, or rankings 60 days post-launch vs. pre-launch GSC baseline |
| Enable client self-service | Client can add/edit a course or blog post without developer involvement |
| Capture leads reliably | Every enquiry form submission and WhatsApp click is logged, zero silent failures |
| Zero recurring cost | $0 hosting, $0 CMS, $0 form backend at Phase 1 launch |

---

## 3. Scope & Non-Goals

### In scope (Phase 1)
- Full static rebuild of all course/guide/category/static content identified in the URL migration audit
- Sveltia CMS content editing workflow for non-technical staff
- Google Apps Script + Sheets lead pipeline with email alerts
- WhatsApp deep-link CTAs across header, sticky mobile bar, and course pages
- Complete 301 redirect map covering all 114 audited legacy URLs
- Pagefind static search

### Explicitly out of scope (Non-Goals)
- No student registration portal with document/photo upload — descoped to a simple lead-capture form (name, phone, email, course interest), same resolution as the Hope InfoTech engagement
- No dynamic server-side logic, database, or authentication system for site visitors in Phase 1
- No custom admin dashboard beyond Sveltia CMS's stock UI
- No CRM integration beyond Google Sheets logging (future phase)
- No paid tooling of any kind at Phase 1 launch
- No LMS, video delivery, or payment processing at Phase 1 — reserved for Phase 2 (Section 10)

---

## 4. Users & Conversion Funnels

**Primary visitor:** College graduate, career switcher, or working professional researching an IT training course (Guidewire, SAP, Oracle, ServiceNow, Salesforce, DevOps, Siemens Teamcenter, etc.), arriving via organic search or a WhatsApp/social share.

**Client-side user:** Non-technical Ask 4 Trainings staff member who needs to add a new course, edit pricing/batch info, publish a blog article, or update contact details — without calling the developer.

### Conversion Funnel A — Course Landing (Transactional)
Visitor lands on a course page (e.g. `/coupa-online-training/`) → fills sticky sidebar enquiry form → lead logged to `Website-Enquiry` Sheet + email alert sent to `ask4trainings@gmail.com`.

### Conversion Funnel B — WhatsApp Consultation
Visitor lands on a course page or header/sticky bar → taps WhatsApp CTA → `https://wa.me/918099949888` opens with a pre-filled message: `Hi Ask4Trainings, I want details about [Course Name]` → click event logged (best-effort analytics, not a lead record).

### Conversion Funnel C — Blog/Guide Inbound
Visitor lands on an informational guide article (early-funnel search intent) → reads editorial content → clicks contextual banner CTA mid-article or at end → lands on the matching Course Landing Page → converts via Funnel A or B.

---

## 5. Content Model — Two Content Types (+ Hybrid Hubs)

Consistent with the Hope InfoTech pattern, but re-derived from Ask 4 Trainings' own 114-URL crawl, which is almost entirely commercial/transactional (only a handful of legacy pages read as informational).

### 5a. Course Landing Pages (Commercial/Transactional)
- Intent: visitor is ready to evaluate and enquire
- Contains: syllabus accordion, batch schedule, prerequisites, sticky enquiry form, WhatsApp CTA, `Course`/`FAQPage`/`BreadcrumbList` JSON-LD
- Data source: `src/content/courses/*.md` (Sveltia CMS-managed, Zod-validated), rendered via `src/pages/[slug].astro`
- The crawl shows the client's content strategy is course-first: the overwhelming majority of the 114 audited URLs are individual course landing pages, not guide articles — this shifts the Phase 1 build weight toward course-page volume relative to Hope InfoTech's split.

### 5b. Guide / Blog Articles (Informational)
- Intent: visitor is researching, comparing, or early-funnel
- Contains: long-form editorial content, contextual banner CTA linking to the matching course landing page
- Data source: `src/content/blog/*.md` (Sveltia CMS-managed), rendered via `src/pages/blog/[slug].astro`
- Phase 1 scope: a small number of net-new guide articles (client's current site has effectively no dedicated blog/guide content type — this is a new addition, not a migration)

### 5c. Category Hub Pages (Hybrid)
One hub per mega menu category (11 total — see Section 6), each with hand-written intro copy (overview + "Career Opportunities") plus a dynamically generated grid of `CourseCard` components filtered from the course collection by `category`. Hubs also serve as the 301 target for legacy WordPress `/category/*` taxonomy URLs that have no single-course equivalent (see Section 7).

### 5d. Known Content Gaps (not launch blockers)
- `/best-data-science-coursein-hyderabad/` and `/cybersecurity-training-in-hyderabad/` are legacy live pages with no corresponding category in the current 11-category taxonomy. They are retained as standalone landing pages at launch and flagged for a taxonomy decision post-launch (either fold into "Development"/"Other Tools" or add a 12th category).
- `/teamcenter-awc-online-training/` (Siemens) currently has 0 recorded traffic but is a live, in-crawl page — it is rebuilt as a full landing page in Phase 1, unlike the equivalent Teamcenter AWC gap on Hope InfoTech (which had no landing page at all).

---

## 6. Full Navigation & Information Architecture

- **Top Contact Strip:** email, phone (`918099949888`), "Write Reviews" CTA, social icons
- **Main Header:** Logo | Home | All Courses (mega menu, 11 categories) | Blog | Student Registration (→ simple lead form) | Contact | Search | WhatsApp pill CTA
- **Mega Menu — 11 Categories:**
  1. Guidewire — PolicyCenter, BillingCenter, ClaimCenter, BA, Testing/Automation, Rating, Cloud, Jutro, DataHub/InfoCenter
  2. Siemens — Teamcenter PLM, Teamcenter AWC, Teamcenter High-Level
  3. New Courses — Palantir Foundry, Kinaxis, Camstar, Polarion
  4. Cloud Computing — AWS, Azure, GCP, Snowflake, OCI
  5. Oracle — Fusion Financials, HCM, SCM, Technical, Flexcube, PeopleSoft, APEX, OIC, OTM
  6. DevOps — CI/CD, Kubernetes, Docker, Terraform
  7. Development — Python Full Stack, Java Full Stack, MERN Stack
  8. MS D365 — Dynamics 365 Finance & Operations, CRM
  9. SAP — FICO S/4HANA, MM, SD, PP, ABAP / ABAP on HANA, CPI, Ariba, EWM, TM, BRIM, BODS, BW on HANA, BW/4HANA, Basis, Security, SuccessFactors
  10. Trending Courses — Salesforce (CPQ, Revenue Cloud, Data Cloud, B2B Commerce, OmniStudio, Velocity), ServiceNow (CSM, GRC, ITOM, SecOps, HRSD, SAM)
  11. Other Tools — SailPoint IdentityIQ, PTC Windchill, Workday (Integration + Financials), Duck Creek
- **Sticky Mobile Bar:** Call + WhatsApp CTA pinned to viewport bottom on scroll (mirrors the floating bubble pattern from Hope InfoTech, extended to a two-action bar per this client's brief)
- **Footer:** 4 columns (Popular Courses, Trending Courses, Terms & Policies, Contact Info) + about paragraph + SEO tag cloud + copyright + social links

---

## 7. URL Structure & SEO Preservation

**Full redirect map and crawl inventory is a first-class deliverable — see `architecture.md` Section 6 for the complete `public/_redirects` file, derived line-by-line from the 114-row migration CSV.**

Key decisions:
- **Root-flat URLs are retained**, not restructured. Unlike Hope InfoTech (which normalized two legacy nested URL patterns), Ask 4 Trainings' entire live crawl is already root-flat — the rebuild keeps every high-performing slug (`/coupa-online-training/`, `/polarion-online-training/`, `/teamcenter-plm-training-online/`, etc.) unchanged as an Astro `[slug].astro` route.
- **Near-duplicate URL pairs are consolidated, not merged in content.** The crawl surfaced roughly 20 duplicate/near-duplicate slug pairs for the same course (e.g. `/sap-tm-online-training/` vs `/sap-transportation-management-training-in-hyderabad/`; `/sap-ariba-online-training/` vs `/sap-ariba-course-in-hyderabad/`). For each pair, the higher-traffic (impressions) URL is kept as canonical and the lower-traffic URL 301s to it — see the full table in `architecture.md`.
- **Legacy taxonomy and platform URLs** (`/category/*`, `/author/*`, `/course-tag/*`, `/events/*`, `/courses/`, `/course-list/`, orphaned LMS lesson fragments) all 301 to their nearest modern equivalent — a category hub where one exists, otherwise the homepage.
- **The one broken asset** (`/wp-content/uploads/2026/04/servicenow-course.jpeg`, already 404 in the crawl) is not migrated and is excluded from the redirect map.
- **Launch strategy: staging-first.** Site builds and is fully verified on `*.pages.dev` before DNS cutover, identical to the Hope InfoTech launch pattern — no content goes live half-finished on the production domain.

---

## 8. Content Management Requirements (Client-Facing)

The client needs to, without developer help:
- Add a new course landing page (title, category, highlights, syllabus, prerequisites, batch info)
- Add a new blog/guide article (rich text, images)
- Edit existing course or article content
- View captured enquiries (name, phone, course, timestamp)

**Solution: Sveltia CMS** — a lightweight, git-backed, Netlify/Decap-config-compatible SPA at `/admin`, chosen over Decap CMS itself (Hope InfoTech's choice) for this engagement because it is actively maintained, loads as a single small SPA bundle rather than Decap's heavier legacy build, and connects to GitHub via a serverless Cloudflare Worker OAuth proxy — keeping the $0-hosting constraint intact while giving a snappier editing experience for the client's day-to-day use.

**Google Sheets** is used only for enquiry data (structured, short, append-only) — the same division of responsibility as Hope InfoTech: long-form content lives in git-backed Markdown, structured lead records live in a spreadsheet.

Client is NOT required to understand git, Markdown syntax, or deployments. One onboarding item: explain that "Save" in Sveltia = a real content commit, and the live site updates within a few minutes via Cloudflare Pages' automatic git-push deploy — no manual rebuild step.

---

## 9. Lead Capture Requirements

- Enquiry form embedded on the homepage hero and the sticky sidebar on every course page.
- Submits client-side via `fetch()` with `mode: 'no-cors'` and a `text/plain` payload to a Google Apps Script Web App endpoint (fire-and-forget pattern — see `architecture.md` for why this makes the success state optimistic, not confirmed).
- Every submission is appended as a row to the `Website-Enquiry` Google Sheet: `Timestamp`, `Name`, `Phone`, `Email`, `Course`, `Message`, `SourcePage`.
- An instant email alert is sent to `ask4trainings@gmail.com` via Apps Script's `MailApp` on every submission.
- WhatsApp CTA opens `https://wa.me/918099949888` with a pre-filled, course-aware message (`?text=Hi Ask4Trainings, I want details about [Course Name]`); tracked via a lightweight click event, not a lead record.
- No full-page redirects or third-party domain redirects on submission (fixes the client's top legacy complaint, same as Hope InfoTech).

---

## 10. Phased Delivery Plan

**Phase 1 — Foundation**
- Astro v4 SSG scaffold, design tokens, base layouts (Course Landing / Blog Article / Category Hub)
- Zod content collection schemas for courses, blog, categories
- Enquiry form wired to Apps Script + Sheets; WhatsApp CTA wired
- Deployed to Cloudflare Pages staging (`*.pages.dev`)

**Phase 2 — Content Migration & SEO Audit**
- All ~113 valid legacy URLs rebuilt or redirected per the migration map
- Duplicate-pair consolidation applied (canonical kept, near-duplicates 301'd)
- Full `public/_redirects` file implemented and tested against the crawl inventory
- Meta titles/descriptions checked against legacy equivalents for regressions
- Sveltia CMS deployed; client edits/adds at least one real course and one real blog post as a live UAT test

**Phase 3 — Production Cutover**
- Manual QA of every redirect (all 114 audited URLs) against the crawl inventory
- Sitemap generated and validated; `EducationalOrganization`, `Course`, `FAQPage`, `BreadcrumbList` JSON-LD verified on representative pages
- DNS cutover to `ask4trainings.com`
- New sitemap submitted to Google Search Console; Coverage/Performance monitored weekly for 4 weeks post-launch

**Phase 4 — Phase 2 LMS Roadmap (future scope, not built in this engagement)**
- Video delivery via Bunny.net Stream (HLS encrypted streaming, signed expiring tokens, dynamic email watermarking)
- Auth & enrollment database via Supabase (free-tier Postgres + Auth)
- Payment processing via Razorpay
- Architecture is designed in Phase 1 to not preclude this addition (see `architecture.md` Section 9), but no LMS code, schema, or UI ships in Phase 1

---

## 11. Risks & Open Items

- No GSC backlink/impression drill-down was available beyond the supplied CSV export — redirect priority for duplicate pairs was resolved on impressions-count comparison rather than full historical ranking data. Recommend requesting deeper GSC access post-launch for ongoing monitoring.
- `/best-data-science-coursein-hyderabad/` and `/cybersecurity-training-in-hyderabad/` sit outside the current 11-category taxonomy — flagged content-gap/taxonomy decision, not a launch blocker (Section 5d).
- Client server hosting was considered and rejected in favor of Cloudflare Pages, for the same reason as Hope InfoTech: shared-server resource contention was the original problem, and hosting on the client's existing shared server would reintroduce it.
- Duplicate-URL consolidation (Section 7) changes which exact URL ranks for ~20 course topics. This is a deliberate SEO consolidation, not an oversight, but should be called out explicitly to the client before cutover since it changes canonical URLs they may be used to sharing manually (e.g. on WhatsApp/social).
- Sveltia CMS is a newer project than Decap CMS (used on Hope InfoTech) — its OAuth proxy and config surface should get the same UAT scrutiny in Phase 2 as a first-time choice, even though it is designed to be Decap-config-compatible.
