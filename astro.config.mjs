import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';

// GitHub Pages config: site + base. Update site to actual repo owner before deploy.
export default defineConfig({
  site: 'https://kfm.github.io',
  base: '/scheinkognat/',
  trailingSlash: 'ignore',
  integrations: [preact()],
  build: {
    format: 'directory',
  },
});
