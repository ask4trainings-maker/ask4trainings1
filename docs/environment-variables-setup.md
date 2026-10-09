# Ask4Trainings — Environment Variables & Integrations Setup Guide

**Author:** Antigravity Engineering  
**Target Repository:** `ask4trainings-maker/ask4trainings1`  
**Target Site:** [https://ask4trainings.com](https://ask4trainings.com)  
**Cloudflare Pages Project:** `ask4trainings`  

---

## 1. Master Environment Variables Specification

The platform utilizes a combination of **client-side public variables** (baked into the static bundle by Astro & Vite) and **server-side secret variables** (evaluated securely on Cloudflare Edge via Pages Functions).

| Variable Name | Scope | Required / Optional | Consumed By | Purpose & Example Value |
| :--- | :--- | :--- | :--- | :--- |
| `PUBLIC_STUDENT_APPS_SCRIPT_URL` | **Public (Client)** | **Required** for live form delivery | [`src/components/EnquiryForm.astro`](file:///home/rahul/Projects/Personal/ask4trainings/src/components/EnquiryForm.astro) | Google Apps Script Webhook URL receiving lead submissions into Google Sheets and triggering instant email notifications.<br>`https://script.google.com/macros/s/AKfycb.../exec` |
| `PUBLIC_APPS_SCRIPT_URL` | **Public (Client)** | Optional (Fallback) | [`src/components/EnquiryForm.astro`](file:///home/rahul/Projects/Personal/ask4trainings/src/components/EnquiryForm.astro) | Secondary fallback webhook URL used if `PUBLIC_STUDENT_APPS_SCRIPT_URL` is undefined.<br>`https://script.google.com/macros/s/AKfycb.../exec` |
| `PUBLIC_GA_MEASUREMENT_ID` | **Public (Client)** | Recommended | [`src/layouts/BaseLayout.astro`](file:///home/rahul/Projects/Personal/ask4trainings/src/layouts/BaseLayout.astro) | Google Analytics 4 Measurement ID for site telemetry and conversion event tracking.<br>`G-XXXXXXXXXX` |
| `PUBLIC_GSC_VERIFICATION_ID` | **Public (Client)** | Recommended | [`src/layouts/BaseLayout.astro`](file:///home/rahul/Projects/Personal/ask4trainings/src/layouts/BaseLayout.astro) | Google Search Console site verification token embedded in `<meta name="google-site-verification">`.<br>`alphanumeric-token-from-google` |
| `PUBLIC_SITE_URL` | **Public (Client)** | Optional | Global Astro canonical context | Canonical website domain override.<br>`https://ask4trainings.com` |
| `GITHUB_CLIENT_ID` | **Secret (Edge)** | **Required** for Sveltia CMS login | [`functions/api/auth.js`](file:///home/rahul/Projects/Personal/ask4trainings/functions/api/auth.js), [`functions/api/callback.js`](file:///home/rahul/Projects/Personal/ask4trainings/functions/api/callback.js) | GitHub OAuth Application Client ID used to initiate editor authentication.<br>`Ov23li...` |
| `GITHUB_CLIENT_SECRET` | **Secret (Edge)** | **Required** for Sveltia CMS login | [`functions/api/callback.js`](file:///home/rahul/Projects/Personal/ask4trainings/functions/api/callback.js) | GitHub OAuth Application Client Secret used by Cloudflare Functions to exchange the temporary auth code for a bearer token.<br>`sec_...` (**Must be Encrypted**) |
| `GITHUB_REPO` | **Secret (Edge)** | Optional | [`functions/api/callback.js`](file:///home/rahul/Projects/Personal/ask4trainings/functions/api/callback.js) | Target repository override for collaborator write-permission verification (defaults to `ask4trainings-maker/ask4trainings1`).<br>`ask4trainings-maker/ask4trainings1` |

---

## 2. Local Development Configuration

### Step 2.1: Initialize `.env`
Run the following command in the project root:
```bash
cp .env.example .env
```

### Step 2.2: Populate Local Values
Edit `.env` with your development values:
```bash
# Google Apps Script Web App Endpoint
PUBLIC_STUDENT_APPS_SCRIPT_URL=https://script.google.com/macros/s/AKfycb.../exec

# Analytics & Verification (Leave blank locally if not testing analytics)
PUBLIC_GA_MEASUREMENT_ID=
PUBLIC_GSC_VERIFICATION_ID=
PUBLIC_SITE_URL=http://localhost:4321
```

> [!NOTE]
> During local development, if `PUBLIC_STUDENT_APPS_SCRIPT_URL` is empty, [`src/components/EnquiryForm.astro`](file:///home/rahul/Projects/Personal/ask4trainings/src/components/EnquiryForm.astro) enters **Dev Mode**. It prints the assembled payload to `console.info()` and simulates a successful submission after 800ms without making external network calls.

### Step 2.3: Verify Local Dev Server
```bash
npm run dev
```
Open [http://localhost:4321/](http://localhost:4321/) in your browser.

---

## 3. Cloudflare Pages Production Configuration (Step-by-Step UI Guide)

Because Cloudflare Pages serves the static Astro application alongside edge functions under `functions/`, all environment variables must be declared in the Cloudflare dashboard.

### Step 3.1: Navigate to Project Settings
1. Log in to the [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. In the left navigation, select **Workers & Pages**.
3. Click on the project name: **`ask4trainings`**.
4. Click on the **Settings** tab.
5. In the sub-menu on the left, click **Environment variables**.

### Step 3.2: Add Variables for Production & Preview
Click **Add variables** and configure the entries:

| Variable Name | Environment Selection | Value | Encrypt Flag |
| :--- | :--- | :--- | :--- |
| `PUBLIC_STUDENT_APPS_SCRIPT_URL` | Production & Preview | `https://script.google.com/macros/s/.../exec` | Plaintext |
| `PUBLIC_GA_MEASUREMENT_ID` | Production | `G-XXXXXXXXXX` | Plaintext |
| `PUBLIC_GSC_VERIFICATION_ID` | Production | `google-verification-token` | Plaintext |
| `PUBLIC_SITE_URL` | Production | `https://ask4trainings.com` | Plaintext |
| `GITHUB_CLIENT_ID` | Production & Preview | `Ov23li...` | Plaintext |
| `GITHUB_CLIENT_SECRET` | Production & Preview | `your_github_client_secret` | **Encrypt (Lock)** 🔒 |
| `GITHUB_REPO` | Production & Preview | `ask4trainings-maker/ask4trainings1` | Plaintext |

> [!CAUTION]
> **Important Security Requirement:** Always click the **Encrypt** button next to `GITHUB_CLIENT_SECRET`. This prevents the secret key from ever being displayed in plaintext in the dashboard or build logs.

### Step 3.3: Critical Rule for Static Builds (`PUBLIC_*` Variables)
In Astro's static generation mode (`output: 'static'`), all client-side variables prefixed with `PUBLIC_*` are **inlined into the static HTML and JavaScript assets at build time**.

- Adding or updating a `PUBLIC_*` variable in Cloudflare **does not take effect immediately on live traffic**.
- **You MUST trigger a new deployment** after saving environment variables:
  1. Go to **Deployments** in Cloudflare Pages.
  2. Click **View build** on the latest deployment, or click **Create deployment** / trigger a git commit push.
  3. Once the build finishes, the new variable values will be baked into the live assets.

---

## 4. Third-Party Service Setup & Acquisition Instructions

### 4.1 Google Apps Script Webhook (Lead Forms)

1. Open Google Sheets and create a target spreadsheet (e.g., `Ask4Trainings Leads 2026`).
2. Copy the Spreadsheet ID from the URL:
   ```
   https://docs.google.com/spreadsheets/d/1nuoZD-NWd53WMrCSGmOT8d6o9EuG8-qKimuo2_x7pCg/edit
                                          └────────────────────────────────────────┘
                                                       SPREADSHEET ID
   ```
3. Open [Google Apps Script](https://script.google.com/) or click **Extensions > Apps Script** in the spreadsheet.
4. Paste the contents of [`apps-script/enquiry-handler.gs`](file:///home/rahul/Projects/Personal/ask4trainings/apps-script/enquiry-handler.gs).
5. Verify line 30 contains your Spreadsheet ID:
   ```javascript
   const SPREADSHEET_ID = '1nuoZD-NWd53WMrCSGmOT8d6o9EuG8-qKimuo2_x7pCg';
   ```
6. Click **Deploy > New deployment**.
7. In the configuration modal:
   - **Select type:** Web app
   - **Description:** Ask4Trainings Production Lead Capture v1
   - **Execute as:** `Me (your Google email)`
   - **Who has access:** `Anyone` *(Crucial: allows unauthenticated public form submissions)*
8. Click **Deploy** and authorize permissions when prompted.
9. Copy the resulting **Web App URL**:
   `https://script.google.com/macros/s/AKfycb.../exec`
10. Paste this URL into `PUBLIC_STUDENT_APPS_SCRIPT_URL`.

---

### 4.2 GitHub OAuth App (Sveltia CMS `/admin/`)

The content manager is powered by Sveltia CMS and connects via GitHub OAuth to allow authorized collaborators to edit content and publish commits.

1. Sign in to GitHub with the `@ask4trainings-maker` account.
2. Navigate to: **Settings > Developer Settings > OAuth Apps** (or go to `https://github.com/settings/developers`).
3. Click **New OAuth App**.
4. Fill in the application fields:
   - **Application name:** `Ask4Trainings CMS`
   - **Homepage URL:** `https://ask4trainings.com` (or `https://ask4trainings.pages.dev`)
   - **Application description:** `Editorial workflow content management system for Ask4Trainings`
   - **Authorization callback URL:** `https://ask4trainings.com/api/callback`  
     *(If testing on Pages preview, you can add `https://ask4trainings.pages.dev/api/callback`)*
5. Click **Register application**.
6. Copy the **Client ID** $\rightarrow$ set as `GITHUB_CLIENT_ID`.
7. Click **Generate a new client secret** $\rightarrow$ copy immediately $\rightarrow$ set as `GITHUB_CLIENT_SECRET` in Cloudflare Pages.

---

### 4.3 Google Analytics 4 (GA4)

1. Open [Google Analytics](https://analytics.google.com/).
2. Select your property: **Ask4Trainings**.
3. Navigate to **Admin (gear icon) > Data collection and modification > Data streams**.
4. Click on the web stream for `https://ask4trainings.com`.
5. Locate the **Measurement ID** (format: `G-XXXXXXXXXX`).
6. Paste into `PUBLIC_GA_MEASUREMENT_ID`.

---

### 4.4 Google Search Console (GSC)

1. Open [Google Search Console](https://search.google.com/search-console).
2. Add property `https://ask4trainings.com` (URL prefix method).
3. Under **Verification methods**, select **HTML tag**.
4. Copy only the `content` string inside:
   ```html
   <meta name="google-site-verification" content="ABC123xyz_verification_token" />
                                                  └───────────────────────────┘
   ```
5. Paste into `PUBLIC_GSC_VERIFICATION_ID`.

---

## 5. Verification Checklist

- [x] All client-facing variables declared in [`src/env.d.ts`](file:///home/rahul/Projects/Personal/ask4trainings/src/env.d.ts).
- [x] Template with zero credentials documented in [`.env.example`](file:///home/rahul/Projects/Personal/ask4trainings/.env.example).
- [x] `npm run check` passes with 0 errors.
- [x] `npm run build` static site builds cleanly with exit code 0.
- [ ] Variables populated in Cloudflare Pages Production & Preview settings.
- [ ] Fresh Cloudflare deployment triggered to bake variables into static bundles.
