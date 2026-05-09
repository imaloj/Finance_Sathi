import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react({
      // Fix for RefreshRuntime already declared error
      fastRefresh: true,
      jsxImportSource: 'react',
    })
  ],
  server: {
    port: 5173,
    strictPort: false,
    host: 'localhost',
  },
  // Build configuration
  build: {
    minify: 'terser',
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
  },
  // Preview server configuration
  preview: {
    port: 4173, // Different port for preview to avoid conflicts with dev server
    strictPort: false,
  }
})