import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined;
          }

          if (id.includes('/three/')) {
            return 'vendor-three-core';
          }

          if (id.includes('framer-motion') || id.includes('motion-dom') || id.includes('motion-utils')) {
            return 'vendor-motion';
          }

          if (id.includes('/gsap/')) {
            return 'vendor-gsap';
          }

          if (id.includes('locomotive-scroll')) {
            return 'vendor-scroll';
          }

          return undefined;
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setupTests.js',
    globals: true,
  },
})
