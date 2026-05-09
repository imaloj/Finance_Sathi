// Strips $ and . from object keys to prevent NoSQL injection
const hasForbiddenChars = (str) => {
  return str.startsWith('$') || str.includes('.');
};

const sanitize = (obj, stack = new Set()) => {
  if (!obj || typeof obj !== 'object') return obj;
  
  // Prevent circular references
  if (stack.has(obj)) return obj;
  stack.add(obj);
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitize(item, stack));
  }
  
  const clean = {};
  for (const key of Object.keys(obj)) {
    const safeKey = hasForbiddenChars(key) ? key.replace(/^\$/, '').replace(/\./g, '_') : key;
    clean[safeKey] = sanitize(obj[key], stack);
  }
  return clean;
};

export const mongoSanitize = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitize(req.body);
  }
  
  // For req.query, create a new sanitized object
  // Express 5 makes req.query read-only, so we use Object.defineProperty
  if (req.query && typeof req.query === 'object') {
    const cleanQuery = sanitize(req.query);
    try {
      req.query = cleanQuery;
    } catch (e) {
      // Express 5: req.query is read-only, attach to req.sanitizedQuery instead
      req.sanitizedQuery = cleanQuery;
    }
  }
  
  if (req.params && typeof req.params === 'object') {
    req.params = sanitize(req.params);
  }
  
  next();
};