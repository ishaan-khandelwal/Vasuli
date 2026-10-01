const User = require('../models/User');
const { verifyAuthToken } = require('../utils/auth');

const authMiddleware = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    const match = typeof header === 'string' ? /^Bearer ([A-Za-z0-9\-_.]+)$/.exec(header) : null;

    if (!match) {
      return res.status(401).json({ message: 'Authorization token is missing.' });
    }

    let payload;
    try {
      payload = verifyAuthToken(match[1]);
    } catch (error) {
      return res.status(401).json({ message: 'Invalid or expired token.' });
    }

    // Database failures must surface as 5xx, not be mistaken for a bad token.
    const user = await User.findById(payload.sub);

    if (!user || (user.tokenVersion || 0) !== (payload.tv || 0)) {
      return res.status(401).json({ message: 'Your session is no longer valid. Please sign in again.' });
    }

    req.user = user;
    req.auth = payload;
    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = { authMiddleware };
