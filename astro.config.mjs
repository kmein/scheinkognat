import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import sitemap from '@astrojs/sitemap';

// GitHub Pages config: site + base. Update site to actual repo owner before deploy.
export default defineConfig({
  site: 'https://kmein.github.io',
  base: '/scheinkognat/',
  trailingSlash: 'ignore',
  integrations: [preact(), sitemap()],
  build: {
    format: 'directory',
  },
});
