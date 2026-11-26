import { defineConfig } from 'vite'

// Served from https://alajter.github.io/cnab-generator/
export default defineConfig({
  base: './',
  build: { outDir: 'dist', target: 'es2022' },
  test: { include: ['test/**/*.test.ts'] },
} as never)
