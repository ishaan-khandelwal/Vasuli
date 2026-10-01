const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const ALGORITHM = 'HS256';
const ISSUER = 'vasuli-backend';
const AUDIENCE = 'vasuli-app';
const MIN_SECRET_LENGTH = 32;

let devFallbackSecret = null;

const isProduction = () => process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);

/**
 * The signing secret must come from the environment. A weak or missing secret is a fatal
 * error in production; in local development a random per-process secret is used instead of
 * a guessable constant (tokens simply become invalid when the dev server restarts).
 */
const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;

  if (secret && secret.length >= MIN_SECRET_LENGTH) {
    return secret;
  }

  if (isProduction()) {
    throw new Error(`JWT_SECRET must be set to a random string of at least ${MIN_SECRET_LENGTH} characters.`);
  }

  if (!devFallbackSecret) {
    devFallbackSecret = crypto.randomBytes(48).toString('hex');
    console.warn('JWT_SECRET is missing or too short. Using a temporary random secret for this process.');
  }

  return devFallbackSecret;
};

const signAuthToken = (user) =>
  jwt.sign(
    {
      sub: user._id.toString(),
      tv: user.tokenVersion || 0,
    },
    getJwtSecret(),
    {
      algorithm: ALGORITHM,
      issuer: ISSUER,
      audience: AUDIENCE,
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    }
  );

const verifyAuthToken = (token) =>
  jwt.verify(token, getJwtSecret(), {
    algorithms: [ALGORITHM],
    issuer: ISSUER,
    audience: AUDIENCE,
  });

/** Constant-time string comparison that does not leak length through timing. */
const safeEqual = (a, b) => {
  const hash = (value) => crypto.createHash('sha256').update(`${value}`).digest();
  return crypto.timingSafeEqual(hash(a), hash(b));
};

module.exports = {
  getJwtSecret,
  isProduction,
  safeEqual,
  signAuthToken,
  verifyAuthToken,
};
