import express from 'express'
import { createServer as createViteServer } from 'vite'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function createServer() {
  const app = express()

  // Create Vite server in middleware mode
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa'
  })

  // Security headers middleware - MUST be before vite middleware
  app.use((req, res, next) => {
    // Skip headers for Vite internal requests
    if (req.url.includes('/@vite') || req.url.includes('/@react-refresh') || req.url.includes('/.vite')) {
      return next()
    }

//csp 
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: https:; " +
      "font-src 'self' data: https:; " +
      "connect-src 'self' ws://localhost:5173 http://localhost:5000 https://api.mistral.ai; " +
      "object-src 'none'; " +
      "base-uri 'self'; " +
      "frame-ancestors 'none'; " +
      "form-action 'self'"
    )

    // Set X-Frame-Options Header
    res.setHeader('X-Frame-Options', 'DENY')

    // Set X-Content-Type-Options Header
    res.setHeader('X-Content-Type-Options', 'nosniff')

    // Set Referrer-Policy Header
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')

    // Set Permissions-Policy Header
    res.setHeader(
      'Permissions-Policy',
      'geolocation=(), camera=(), microphone=(), magnetometer=(), gyroscope=(), accelerometer=(), usb=(), payment=()'
    )

    next()
  })

  // Use vite's connect instance as middleware
  app.use(vite.middlewares)

  // Handle SPA fallback - serve index.html for all non-file routes (FIXED)
  app.use(async (req, res, next) => {
    // Check if it's a request for a file (has extension) or API route
    if (req.url.includes('.') || req.url.startsWith('/api')) {
      return next()
    }

    try {
      const indexHtml = path.resolve(__dirname, 'index.html')
      const html = fs.readFileSync(indexHtml, 'utf-8')
      const transformed = await vite.transformIndexHtml(req.url, html)
      res.status(200).set({ 'Content-Type': 'text/html' }).end(transformed)
    } catch (e) {
      vite.ssrFixStacktrace(e)
      res.status(500).end(e.message)
    }
  })

  const port = 5173
  const server = app.listen(port, () => {
    console.log('\n✓ Vite dev server listening on http://localhost:5173')
    console.log('✓ Security headers enabled:')
    console.log('  - Content-Security-Policy ✓')
    console.log('  - X-Frame-Options: DENY ✓')
    console.log('  - X-Content-Type-Options: nosniff ✓')
    console.log('  - Referrer-Policy ✓')
    console.log('  - Permissions-Policy ✓\n')
    console.log('Connect backend at: http://localhost:5000\n')
  })

  return { app, vite, server }
}

createServer().catch(err => {
  console.error('Failed to start dev server:', err)
  process.exit(1)
})