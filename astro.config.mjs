import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';

export default defineConfig({
  site: 'https://ask4trainings.com',
  output: 'static',
  integrations: [
    tailwind({
      applyBaseStyles: true,
    }),
    sitemap(),
    react(),
  ],
});