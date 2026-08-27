import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // Para compatibilidad total con GitHub Pages y Hash Routing
  server: {
    host: true, // Expone automáticamente el servidor a la red local al ejecutar npm run dev
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
