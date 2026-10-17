import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { compression } from 'vite-plugin-compression2'

export default defineConfig({
  plugins: [
    react(),
    // Pre-compress assets at build time so nginx can serve .br/.gz statically
    // (gzip_static / brotli_static) with zero per-request CPU.
    compression({ algorithms: ['gzip', 'brotliCompress'], threshold: 1024, deleteOriginalAssets: false }),
  ],
  // Keep previously hashed assets so clients with an older bundle still load
  // until they reload (prevents "chunk not found" after a redeploy).
  build: {
    emptyOutDir: false,
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
