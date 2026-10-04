import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';
import remarkBlogCtas from './remark-blog-ctas.mjs';

export default defineConfig({
  site: 'https://ask4trainings.com',
  output: 'static',
  trailingSlash: 'always',

  vite: {
    tsconfig: './tsconfig.json',
  },

  markdown: {
    remarkPlugins: [remarkBlogCtas],
  },

  build: {
    format: 'directory',
  },
  image: {
    service: { entrypoint: 'astro/assets/services/sharp' },
    domains: ['ask4trainings.com'],
  },
  integrations: [
    tailwind({
      applyBaseStyles: true,
    }),
    sitemap({
      filter: (page) => !page.includes('/admin/')
    }),
    react(),
  ],
});