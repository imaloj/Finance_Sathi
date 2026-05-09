export const securityHeaders = {
  contentSecurityPolicy: {
    directives: {
      // Default source for all content types not explicitly defined
      defaultSrc: ["'self'"],
      
      // Script sources - only self (inline scripts blocked)
      scriptSrc: ["'self'"],
      
      // Style sources - self + inline (if needed for styled-components/CSS-in-JS)
      styleSrc: ["'self'", "'unsafe-inline'"],
      
      // Image sources - self, data URIs, and HTTPS images
      imgSrc: ["'self'", 'data:', 'https:'],
      
      // Font sources - self and HTTPS
      fontSrc: ["'self'", 'https:', 'data:'],
      
      // Media sources (audio/video)
      mediaSrc: ["'self'"],
      
      // API/XHR/WebSocket connections
      connectSrc: [
        "'self'",
        process.env.CLIENT_URL || 'http://localhost:5173',
        'https://api.mistral.ai' // If using Mistral API
      ],
      
      // Form submission targets
      formAction: ["'self'"],
      
      // Prevent embedding of objects (plugins)
      objectSrc: ["'none'"],
      
      // Prevent embedding in iframes
      frameSrc: ["'none'"],
      
      // Base URI restriction
      baseUri: ["'self'"],
      
      // Prevent framing of this site in other sites
      frameAncestors: ["'none'"],
      
      // Upgrade insecure requests to HTTPS
      upgradeInsecureRequests: []
    },
    // Report violations to an endpoint (optional - for monitoring)
    reportUri: process.env.CSP_REPORT_URI || '/api/csp-report',
    
    // Report only mode for testing (set to false for production enforcement)
    reportOnly: process.env.CSP_REPORT_ONLY === 'true' ? true : false
  },

  // X-Frame-Options: Prevent clickjacking
  frameguard: {
    action: 'deny' // or 'sameorigin' if framing within same origin is needed
  },

  // X-Content-Type-Options: Prevent MIME sniffing
  xContentTypeOptions: true,

  // Referrer-Policy: Control referrer information
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin'
  },

  // HSTS: Force HTTPS in production
  hsts: {
    maxAge: 31536000, // 1 year in seconds
    includeSubDomains: true,
    preload: true // Include in HSTS preload list
  },

  // Cross-Origin policies
  crossOriginEmbedderPolicy: false, // Set to true if serving cross-origin resources
  crossOriginOpenerPolicy: {
    policy: 'same-origin'
  },
  crossOriginResourcePolicy: {
    policy: 'cross-origin' // Adjust based on your needs
  },

  // Permissions-Policy: Control browser features
  permissionsPolicy: {
    features: {
      // Geolocation
      geolocation: ["()"], // Disable geolocation access
      // Camera
      camera: ["()"],
      // Microphone
      microphone: ["()"],
      // Magnetometer
      magnetometer: ["()"],
      // Gyroscope
      gyroscope: ["()"],
      // Accelerometer
      accelerometer: ["()"],
      // USB
      usb: ["()"],
      // Payment Request API
      'payment': ["()"]
    }
  }
};

// CSP violation report handler middleware
export const cspReportHandler = (req, res) => {
  const violation = req.body;
  console.warn('CSP Violation Report:', {
    'document-uri': violation['document-uri'],
    'violated-directive': violation['violated-directive'],
    'effective-directive': violation['effective-directive'],
    'original-policy': violation['original-policy'],
    'blocked-uri': violation['blocked-uri'],
    'disposition': violation['disposition'],
    'status-code': violation['status-code'],
    timestamp: new Date().toISOString()
  });
  
  // You can send this to a logging service (Sentry, DataDog, etc.)
  res.status(204).end(); // Return 204 No Content
};