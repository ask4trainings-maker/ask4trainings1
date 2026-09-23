# Hope InfoTech — Developer CMS Architecture & Technical Guide

This document outlines the CMS architecture, configuration structure, type-safety integration, and instructions for developers extending or modifying the CMS schema in this repository.

---

## 1. Architecture Overview

The CMS layer is built using **Sveltia CMS** (a lightweight drop-in replacement for Decap CMS).

```
┌─────────────────────────────────────────────────────────┐
│                    Sveltia CMS                          │
│        (Mounted at /admin via src/pages/admin/index.astro) │
└──────────────────────────┬──────────────────────────────┘
                           │ Configured by public/admin/config.yml
                           ▼
 ┌──────────────────────────────────────────────────┐
 │                  Storage Layer                   │
 ├─────────────────────────┬────────────────────────┤
 │ Markdown Collections    │ JSON Singletons        │
 │ (src/content/courses/) │ (src/data/pages/*.json)│
 │ (src/content/blog/)    │ (src/data/*.json)      │
 └────────────┬────────────┴───────────┬────────────┘
              │                        │
              ▼                        ▼
 ┌──────────────────────────────────────────────────┐
 │           Astro Content Collections               │
 │           (Validated by src/content.config.ts)   │
 └─────────────────────────┬────────────────────────┘
                           │ Consumed by
                           ▼
 ┌──────────────────────────────────────────────────┐
 │         Astro Pages & UI Components              │
 └──────────────────────────────────────────────────┘
```

---

## 2. Key Configuration Files

| File Path | Description |
| :--- | :--- |
| **`public/admin/config.yml`** | Central CMS configuration. Defines collections, singletons, fields, widgets, media paths, and backend settings. |
| **`src/content.config.ts`** | Astro Content Collections schemas written in Zod. Enforces runtime type-safety and safe fallbacks (`.default()`, `.catch()`). |
| **`src/pages/admin/index.astro`** | Static Astro route mounting the Sveltia CMS script (`@sveltia/cms`). Prevents dynamic `[slug].astro` from hijacking `/admin/`. |
| **`package.json`** | Contains `"cms:proxy": "npx decap-server"` for local filesystem editing. |

---

## 3. Local Backend vs Production Workflows

### **Production Workflow (GitHub Backend)**
- **Config:** `publish_mode: editorial_workflow` and `backend.name: github`.
- **Authentication:** Cloudflare Worker OAuth handshake (`https://decap-oauth.rahul0987abhishek.workers.dev`).
- **Behavior:** 
  - Clicking **Save** creates a Git branch (`cms/...`) and a Pull Request in the background.
  - Setting status to **Ready** and clicking **Publish** merges the PR into `main`.
  - Cloudflare Pages detects the commit to `main` and runs `npm run build`.

### **Local Development Workflow (`local_backend`)**
- **Config:** `local_backend: true` (uncommented during local development).
- **Execution:** Requires running `npm run cms:proxy` alongside `astro dev --background`.
- **Behavior:** 
  - Intercepts CMS API calls and writes directly to local filesystem files (`src/content/`, `src/data/`).
  - **Important Note:** Local backend proxy does not support Git branch creation. It automatically uses the **Simple Workflow** (direct file edits with a single "Save" button).

---

## 4. How to Extend the CMS (Developer Guide)

When adding a new field, collection, or singleton to the CMS, follow these **3 mandatory steps**:

### Step 1: Update CMS Schema (`public/admin/config.yml`)
Add the widget to the desired collection or singleton in `config.yml`:

```yaml
# Example: Adding an instructor badge field to courses
- { label: "Instructor Badge", name: "instructorBadge", widget: "string", required: false }
```

### Step 2: Update Astro Content Schema (`src/content.config.ts`)
To prevent Astro build errors when legacy content lacks this field, **always use safe `.optional()`, `.default()`, or `.catch()` fallbacks**:

```typescript
// src/content.config.ts
const courses = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/courses' }),
  schema: z.object({
    // Add new field with safe default
    instructorBadge: z.string().optional().default("Certified Expert").catch("Certified Expert"),
    // ...
  }),
});
```

### Step 3: Consume in UI Components
Access the new field in Astro page components via `entry.data`:

```astro
---
// src/components/course-details/HeroSection.astro
const { instructorBadge } = Astro.props;
---
{instructorBadge && (
  <span class="badge">{instructorBadge}</span>
)}
```

---

## 5. Summary Checklist for Code Reviews

- [ ] New fields added to `public/admin/config.yml` must match `src/content.config.ts`.
- [ ] Schema changes in `src/content.config.ts` must use `.catch(...)` or `.default(...)` to prevent breaking existing build outputs.
- [ ] `local_backend: true` should be commented out prior to releasing changes to production.
- [ ] Test build locally with `npm run build` after modifying any CMS fields.
