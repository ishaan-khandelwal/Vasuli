const rateLimit = require('express-rate-limit');

const build = ({ windowMs, limit, message }) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { message },
  });

// Per-instance limits (serverless instances do not share memory). Durable per-account
// lockout for password guessing is enforced separately in the auth controller.
const apiLimiter = build({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  message: 'Too many requests. Please slow down and try again shortly.',
});

const authLimiter = build({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  message: 'Too many authentication attempts. Please try again later.',
});

const uploadLimiter = build({
  windowMs: 15 * 60 * 1000,
  limit: 40,
  message: 'Too many uploads. Please try again later.',
});

module.exports = { apiLimiter, authLimiter, uploadLimiter };
