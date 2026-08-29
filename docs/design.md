# Design System, UI/UX Guidelines & Micro-interactions
## Ask 4 Trainings Website Rebuild

**Version:** 1.0
**Brand Theme:** Modern EdTech / Professional Training Institute
**Sister Project:** Hope InfoTech — same interaction philosophy (zero-JS-first, fast-by-default), distinct palette and a wider mega menu (11 categories vs. Hope InfoTech's category set)

---

## 1. Design Principles

1. **Fast by default.** Every design decision is evaluated against page weight and CWV impact before aesthetics — this client's current pages exceed 2MB, so the rebuild treats page weight as a harder constraint than on Hope InfoTech (200KB target holds, but with less headroom given the larger course-page volume).
2. **Two distinct content voices.** Course Landing Pages read as commercial/confident (short punchy copy, clear CTAs, urgency-appropriate amber accents). Guide/Blog Articles read as editorial/informational (longer-form, calmer, no hard sell until the CTA banner).
3. **Zero-JS-first interactions.** Every micro-interaction is attempted in pure CSS/native HTML first (`<details>`, `:focus-within`, CSS transitions). JavaScript is added only where genuinely required (search, form, mega menu on touch).
4. **Editable without breaking.** Non-technical staff paste real, variable-length copy via Sveltia CMS — every text-bearing component must degrade gracefully with variable-length content, including the notably longer SAP/Oracle module names in this client's syllabus data (e.g. "SAP Transportation Management (TM)" vs. Hope InfoTech's shorter course names).
5. **11-category taxonomy scales differently than a 2–3 category menu.** The mega menu is the single highest-complexity UI surface on this project (Section 4) — it must stay legible and fast with roughly 3x the category count of a typical training-site menu.

---

## 2. Design Tokens

### Color

```css
:root {
  /* Brand — Deep Emerald Green */
  --color-primary: #0D6E4F;        /* headers, primary CTAs, trust elements */
  --color-primary-hover: #09533B;
  --color-primary-light: #ECFDF5;  /* badge backgrounds */

  /* Accent — Warm Amber Gold */
  --color-accent: #F59E0B;         /* secondary urgency CTAs: "Watch Free Demo", "Download Syllabus" */
  --color-accent-hover: #D97706;

  /* WhatsApp CTA — fixed brand color, do not theme */
  --color-whatsapp: #25D366;
  --color-whatsapp-hover: #1EBE57;

  /* Neutral scale */
  --color-ink-900: #0F172A;   /* Slate Dark */
  --color-ink-700: #334155;   /* Slate Body */
  --color-ink-500: #64748B;   /* Slate Muted */
  --color-surface-0: #FFFFFF; /* Surface White */
  --color-surface-50: #F8FAFC;/* Off-White */
  --color-surface-100: #F1F5F9;
  --color-border: #E2E8F0;

  /* Semantic */
  --color-success: #16A34A;
  --color-error: #DC2626;
}
```

Emerald replaces Hope InfoTech's deep-blue primary; amber gold plays the same secondary-CTA role in both systems, but here it's positioned explicitly around urgency actions ("Watch Free Demo", "Download Syllabus") rather than general badges/highlights.

### Typography

```css
:root {
  --font-heading: 'Inter', system-ui, sans-serif;
  --font-body: 'Inter', system-ui, sans-serif;

  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.25rem;
  --text-2xl: 1.5rem;
  --text-3xl: 1.875rem;
  --text-4xl: 2.25rem;
  --text-5xl: 3rem;
}
```

- Course Landing Pages: headings at `--text-3xl` to `--text-5xl`, tight leading, high contrast.
- Blog/Guide Articles: body copy at `--text-lg` with relaxed line-height (`leading-relaxed`, 1.75) for long-form readability.

### Spacing & Radius

Standard Tailwind scale, no custom overrides. `rounded-lg` (0.5rem) as the default card/button radius across both templates for visual consistency with the emerald/amber palette above.

---

## 3. Component Specs by Template

### 3a. Course Landing Page (Commercial)

- **Hero:** course title, one-line value prop, primary CTA button (`--color-primary`) + WhatsApp pill (`--color-whatsapp`, fixed, not themed) + secondary amber CTA ("Watch Free Demo" / "Download Syllabus" where applicable), breadcrumb (Home / Category / Course).
- **Highlights strip:** 3–4 icon + short-text cards (e.g., "100% Placement Support," "Live Project Work").
- **Syllabus:** native `<details>/<summary>` accordion, one entry per module. **Must have explicit custom styling** — default browser disclosure triangles look broken/unstyled if left untouched. Style the marker in `--color-primary`, add a rotate transition on open, and ensure a visible focus ring for keyboard users. Given this client's SAP/Oracle module names run longer than typical (e.g. "Oracle Fusion Supply Chain Management (SCM)"), test the accordion header at both single-line and two-line wrap.
- **Sticky sidebar enquiry form:** sticky-positioned on desktop (`sticky top-24`), collapses to an inline form + floating "Enquire Now" button on mobile that scrolls to the form on tap.
- **Batch info card:** dates/format, editable via CMS `batchInfo` field.
- **Related Guide banner** (optional, if `relatedGuideSlug` present): "Want the full career roadmap? Read our [Course] guide →"

### 3b. Guide/Blog Article (Informational)

- **Hero:** title, hero image (optional), publish date, category tag — no CTA in the hero itself, keep it editorial.
- **Body:** rendered markdown, `prose`-style typography (Tailwind Typography plugin), using `--color-primary` for link/blockquote accents rather than Hope InfoTech's blue.
- **Contextual CTA banner:** appears once, roughly mid-article and again at the end — NOT a sticky/floating element, since aggressive CTAs contradict the informational intent. Text pattern: "Ready to get certified? Explore the [Course Name] training program →" linking to `relatedCourseSlug`, or the category hub if `ctaHubSlug` is used instead.

### 3c. Category Hub Page (Hybrid)

- **Intro block:** 2-paragraph hand-written overview + "Career Opportunities" subsection (from `categories.json`), one per each of the 11 categories.
- **Course grid:** responsive card grid (1 col mobile, 2 col tablet, 3 col desktop) of `CourseCard` components filtered by category, pulling title, one-line highlight, and a "View Course" link from each course's frontmatter. The SAP and Guidewire hubs will run notably longer grids than the New Courses or MS D365 hubs (9+ SAP modules vs. 2 D365 modules) — the grid must not assume a roughly even course count per category.

---

## 4. Header & Mega Menu (11 Categories)

- **Desktop:** hover-triggered mega menu with opacity + scale transition (150ms ease-out) and backdrop blur behind the panel. With 11 categories, the panel is laid out as a 3–4 column grid rather than Hope InfoTech's simpler single-row/short-list layout, so each category's course list stays scannable without excessive vertical scroll inside the panel.
- **Mobile/Tablet (critical — commonly missed):** hover does not exist on touch devices. Mega menu must use `:focus-within` or a minimal tap-toggle script — do not ship a hover-only implementation and assume it "just works" on mobile. At 11 categories, mobile collapses to an accordion-of-accordions (category → course list), and this needs explicit QA on a real touch device, not just a resized desktop browser window.
- **Search icon:** opens a modal, lazy-loads Pagefind's WASM bundle only on first open (not on page load) — indexing ~90 course pages plus guides, so the index itself will be larger than Hope InfoTech's; keep the lazy-load discipline strict.
- **WhatsApp pill CTA:** fixed in header on desktop; on mobile it's part of the two-action sticky bottom bar (Call + WhatsApp, `fixed bottom-0 inset-x-0 z-50`) per this client's brief — a wider bar than Hope InfoTech's single floating bubble, since Call is an equally important channel for this client.

---

## 5. Micro-interactions

| Interaction | Implementation | Cost |
|---|---|---|
| Scroll reveals | Single shared `IntersectionObserver` instance (not one per element), toggling `opacity-0 translate-y-4` → `opacity-100 translate-y-0` | <1KB JS |
| Card hover lift | `hover:-translate-y-1 hover:shadow-xl transition-transform` | 0 KB (pure CSS) |
| Syllabus accordion | Native `<details>/<summary>` with custom marker styling | 0 KB JS |
| Mega menu (desktop) | CSS opacity/scale transition on hover, 3–4 column grid layout | 0 KB JS |
| Mega menu (mobile) | `:focus-within` or minimal tap-toggle, nested accordion | <1KB JS |
| Form submit state | Inline spinner + optimistic success message (see architecture.md Section 5 for why this is optimistic, not confirmed) | React/Astro island |
| Sticky mobile bar (Call + WhatsApp) | Fixed position, appears after hero scroll-past | 0 KB (pure CSS) |

**Explicitly excluded per original constraints:** GSAP, Three.js, Framer Motion. All motion above is achievable in Tailwind's transition utilities + native CSS.

---

## 6. Accessibility Requirements

- All interactive elements (accordion summaries, mega menu triggers, form fields) must have visible focus states — do not rely on default browser outlines alone given the custom styling applied elsewhere.
- Enquiry form fields require associated `<label>` elements (not placeholder-only labels) for screen reader support.
- **Color contrast: WCAG AAA (7:1) for body text**, a stricter bar than Hope InfoTech's AA (4.5:1) target. Verify this specifically for `--color-ink-500` on `--color-surface-50`/`--color-surface-100` backgrounds, and for white text on `--color-primary` (`#0D6E4F`) and `--color-accent` (`#F59E0B`) button fills — amber-on-white and white-on-amber are the tightest pairs in this palette and need explicit contrast-checker verification, not an assumption carried over from the emerald pairs.
- WhatsApp floating/sticky bar must have an `aria-label` ("Chat on WhatsApp") on the WhatsApp action, and a distinct `aria-label` ("Call Ask 4 Trainings") on the Call action, since both are icon-led in the mobile bar.

---

## 7. Content-Editing Safety Guidelines (for CMS-authored content)

Since non-technical staff will paste real, variable-length copy via Sveltia CMS:

- No component should assume a fixed character count — test the syllabus accordion, course cards, and hero titles with the longest realistic legacy copy. This client's SAP/Oracle course titles run longer on average than Hope InfoTech's (e.g. "Best SAP ABAP on HANA Training in Hyderabad" at 45+ characters as a *slug-derived* title), so widen the "longest realistic" test set accordingly rather than reusing Hope InfoTech's test strings.
- Image fields in Sveltia should specify recommended dimensions in the field's UI hint text (e.g., "1200×630px recommended for hero images") since the client has no way to know this otherwise, and unoptimized/mismatched aspect ratios will visibly break the hero layout.
- Rich text (markdown) fields should avoid encouraging staff to paste content with inline styling from Word/Google Docs — provide a short internal note (not user-facing) reminding whoever backfills content to paste as plain text and re-apply formatting via Sveltia's toolbar, to avoid style bleed from source documents.
- The `slug` field on migrated courses is editorially sensitive: it's tied 1:1 to a specific legacy URL and, for the ~20 consolidated duplicate pairs, to a specific `_redirects` entry (architecture.md Section 6). Add a visible CMS hint on that field warning staff not to change it without developer involvement, since an edit would silently break a live 301.
