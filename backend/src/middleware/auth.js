const User = require('../models/User');
const { verifyAuthToken } = require('../utils/auth');

const authMiddleware = async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({ message: 'Authorization token is missing.' });
    }

    const payload = verifyAuthToken(token);
    const user = await User.findById(payload.sub);

    if (!user) {
      return res.status(401).json({ message: 'Your session is no longer valid. Please sign in again.' });
    }

    req.user = user;
    req.auth = payload;
    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
};

module.exports = { authMiddleware };
