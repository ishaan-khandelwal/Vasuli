const bcrypt = require('bcryptjs');
const AppData = require('../models/AppData');
const User = require('../models/User');
const { signAuthToken } = require('../utils/auth');
const { createDefaultAppData, createDefaultProfile } = require('../utils/defaults');

const normalizeAppDataResponse = (appData, fallbackName) => ({
  groups: appData?.groups || [],
  personalLoans: appData?.personalLoans || [],
  profile: appData?.profile || createDefaultProfile(fallbackName),
});

const ensureAppDataForUser = async (user) => {
  let appData = await AppData.findOne({ user: user._id });

  if (!appData) {
    appData = await AppData.create({
      user: user._id,
      ...createDefaultAppData(user.name),
    });
  }

  return appData;
};

const register = async (req, res, next) => {
  try {
    const name = `${req.body.name || ''}`.trim();
    const email = `${req.body.email || ''}`.trim().toLowerCase();
    const password = `${req.body.password || ''}`;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      name,
      email,
      passwordHash,
    });

    const appData = await ensureAppDataForUser(user);
    const token = signAuthToken(user);

    return res.status(201).json({
      token,
      user: user.toSafeObject(),
      appData: normalizeAppDataResponse(appData, user.name),
    });
  } catch (error) {
    return next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const email = `${req.body.email || ''}`.trim().toLowerCase();
    const password = `${req.body.password || ''}`;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Incorrect email or password.' });
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Incorrect email or password.' });
    }

    const appData = await ensureAppDataForUser(user);
    const token = signAuthToken(user);

    return res.json({
      token,
      user: user.toSafeObject(),
      appData: normalizeAppDataResponse(appData, user.name),
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  login,
  register,
};
