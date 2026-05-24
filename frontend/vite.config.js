import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react({
      fastRefresh: true,
      jsxImportSource: 'react',
    }),
    tailwindcss()],
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