import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // Para compatibilidad total con GitHub Pages y Hash Routing
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
