import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  // GitHub Pages build sets DEPLOY_TARGET=pages (served under /novice-idle/); Firebase Hosting serves at the root.
  base: process.env.DEPLOY_TARGET === 'pages' ? '/novice-idle/' : '/',
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: { target: 'es2020', sourcemap: false },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
