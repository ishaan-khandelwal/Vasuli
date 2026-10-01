const { safeEqual } = require('../utils/auth');

const MIN_ADMIN_KEY_LENGTH = 32;

/**
 * Admin endpoints are disabled unless ADMIN_API_KEY (>= 32 chars) is configured, and then
 * require it in the `x-admin-key` header. The comparison is constant-time.
 */
const adminAuthMiddleware = (req, res, next) => {
  const expected = process.env.ADMIN_API_KEY;

  if (!expected || expected.length < MIN_ADMIN_KEY_LENGTH) {
    return res.status(404).json({ message: 'Route not found.' });
  }

  const provided = req.headers['x-admin-key'];

  if (typeof provided !== 'string' || !safeEqual(provided, expected)) {
    return res.status(401).json({ message: 'Unauthorized.' });
  }

  return next();
};

module.exports = { adminAuthMiddleware };
