const rateLimit = require('express-rate-limit');

// Per-user upload rate limiter. Requires authenticate middleware to have run
// first so req.user.id is available as the key.
// Limit and window are configurable via env vars for testing; defaults match
// the contract (10 requests / 60 seconds).
const uploadLimiter = rateLimit({
  windowMs: Number(process.env.UPLOAD_RATE_WINDOW_MS) || 60_000,
  max: Number(process.env.UPLOAD_RATE_LIMIT) || 10,
  // authenticate middleware always runs before this limiter, so req.user.id is always set.
  keyGenerator: (req) => String(req.user.id),
  handler: (_req, res) => {
    res.status(429).json({ success: false, error: 'Too many upload requests. Please wait before trying again.' });
  },
  standardHeaders: false,
  legacyHeaders: false,
  validate: { keyGeneratorIpFallback: false },
});

// Global per-IP rate limiter applied to all routes. Protects against broad
// scraping and brute-force traffic without blocking legitimate usage.
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.GENERAL_RATE_LIMIT_MAX) || 100,
  handler: (_req, res) => {
    res.status(429).json({ success: false, error: 'Too many requests. Please slow down.' });
  },
  standardHeaders: false,
  legacyHeaders: false,
});

module.exports = { uploadLimiter, globalLimiter };
