import { build as bundle } from 'esbuild';
import { build } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/postcss';
import { copyFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
await build({
  configFile: false,
  root: root + 'netlify/client',
  publicDir: root + 'public',
  plugins: [react()],
  css: { postcss: { plugins: [tailwind()] } },
  build: { outDir: root + 'dist/hostinger/public', emptyOutDir: true },
});
await mkdir(root + 'dist/hostinger', { recursive: true });
await bundle({
  entryPoints: [root + 'hostinger/server.ts'],
  outfile: root + 'dist/hostinger/server.mjs',
  bundle: true, platform: 'node', target: 'node22', format: 'esm', packages: 'external',
});
await copyFile(root + 'hostinger/schema.sql', root + 'dist/hostinger/schema.sql');
