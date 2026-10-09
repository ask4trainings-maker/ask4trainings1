/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
  /** Webhook endpoint for student lead submissions (Google Apps Script Web App URL) */
  readonly PUBLIC_STUDENT_APPS_SCRIPT_URL?: string;
  /** Fallback webhook endpoint for lead submissions */
  readonly PUBLIC_APPS_SCRIPT_URL?: string;
  /** Google Analytics 4 Measurement ID (e.g., G-XXXXXXXXXX) */
  readonly PUBLIC_GA_MEASUREMENT_ID?: string;
  /** Google Search Console HTML verification token */
  readonly PUBLIC_GSC_VERIFICATION_ID?: string;
  /** Production site domain (e.g., https://ask4trainings.com) */
  readonly PUBLIC_SITE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}