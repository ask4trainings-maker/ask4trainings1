import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';
import remarkBlogCtas from './remark-blog-ctas.mjs';

export default defineConfig({
  site: 'https://ask4trainings.pages.dev',
  output: 'static',
  trailingSlash: 'ignore',

  vite: {
    tsconfig: './tsconfig.json',
  },

  markdown: {
    remarkPlugins: [remarkBlogCtas],
  },

  build: {
    format: 'directory',
  },
  integrations: [
    tailwind({
      applyBaseStyles: true,
    }),
    sitemap(),
    react(),
  ],
});