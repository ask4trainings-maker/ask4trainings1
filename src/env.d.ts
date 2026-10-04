/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_GA_MEASUREMENT_ID?: string;
  readonly PUBLIC_GSC_VERIFICATION_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}