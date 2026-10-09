const helmet = require('helmet');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const { validationResult } = require('express-validator');

/**
 * Helmet security headers middleware.
 * Sets CSP, X-Frame-Options, X-Content-Type-Options, HSTS, etc.
 */
const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  frameguard: { action: 'deny' },
  noSniff: true,
});

/**
 * Attach a correlation ID to every request.
 */
function correlationId(req, res, next) {
  req.correlationId = crypto.randomUUID();
  res.setHeader('X-Correlation-Id', req.correlationId);
  next();
}

/**
 * CSRF token generation — sets a CSRF token cookie and exposes it via header.
 * State-changing routes should verify req.headers['x-csrf-token'] === req.cookies['csrf-token'].
 */
function csrfToken(req, res, next) {
  if (!req.cookies || !req.cookies['csrf-token']) {
    const token = crypto.randomBytes(32).toString('hex');
    res.cookie('csrf-token', token, {
      httpOnly: false, // must be readable by JS to send as header
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
    });
  }
  next();
}

/**
 * CSRF verification middleware — use on state-changing routes.
 */
function verifyCsrf(req, res, next) {
  const cookieToken = req.cookies && req.cookies['csrf-token'];
  const headerToken = req.headers['x-csrf-token'];
  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({ success: false, message: 'Invalid CSRF token' });
  }
  next();
}

/**
 * Basic input sanitization — strips null bytes, trims strings, removes MongoDB operators.
 */
function sanitizeInput(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = deepSanitize(req.body);
  }
  next();
}

function deepSanitize(obj) {
  if (Array.isArray(obj)) return obj.map(deepSanitize);
  if (obj !== null && typeof obj === 'object') {
    const clean = {};
    for (const key of Object.keys(obj)) {
      // Strip keys starting with $ (NoSQL injection)
      if (key.startsWith('$')) continue;
      clean[key] = deepSanitize(obj[key]);
    }
    return clean;
  }
  if (typeof obj === 'string') {
    return obj.replace(/\0/g, '').trim();
  }
  return obj;
}

// Removed: express-mongo-sanitize and xss-clean were no-ops.
// Input sanitization is handled by sanitizeInput() below.

/**
 * General API rate limiter — adjusted for development vs production.
 * Requirements: 24.1
 */
const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // More lenient in development
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});

/**
 * Strict rate limiter for auth endpoints — adjusted for development vs production.
 * Requirements: 24.1
 */
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 20 : 200, // More lenient in development
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many auth requests, please try again later.' },
});

/**
 * Express-validator result handler — returns 422 if validation errors exist.
 */
function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }
  next();
}

module.exports = {
  helmetMiddleware,
  correlationId,
  csrfToken,
  verifyCsrf,
  sanitizeInput,
  apiRateLimiter,
  authRateLimiter,
  handleValidationErrors,
};
