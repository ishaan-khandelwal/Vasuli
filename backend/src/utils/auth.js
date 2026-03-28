const jwt = require('jsonwebtoken');

const getJwtSecret = () => process.env.JWT_SECRET || 'dev-only-change-me';

const signAuthToken = (user) =>
  jwt.sign(
    {
      sub: user._id.toString(),
      email: user.email,
    },
    getJwtSecret(),
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    }
  );

const verifyAuthToken = (token) => jwt.verify(token, getJwtSecret());

module.exports = {
  signAuthToken,
  verifyAuthToken,
};
