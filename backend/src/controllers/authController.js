const bcrypt = require('bcryptjs');
const AppData = require('../models/AppData');
const User = require('../models/User');
const { signAuthToken } = require('../utils/auth');
const { createDefaultAppData, createDefaultProfile } = require('../utils/defaults');

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_BYTES = 72; // bcrypt silently ignores anything beyond 72 bytes
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Used to keep login timing similar whether or not the account exists.
const DUMMY_HASH = bcrypt.hashSync('vasuli-timing-equaliser', 12);

const asString = (value) => (typeof value === 'string' ? value : '');

const badRequest = (res, message) => res.status(400).json({ message });

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
    const name = asString(req.body?.name).trim();
    const email = asString(req.body?.email).trim().toLowerCase();
    const password = asString(req.body?.password);

    if (!name || !email || !password) {
      return badRequest(res, 'Name, email, and password are required.');
    }

    if (name.length > 80) {
      return badRequest(res, 'Name must be 80 characters or fewer.');
    }

    if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
      return badRequest(res, 'Please enter a valid email address.');
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      return badRequest(res, `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`);
    }

    if (Buffer.byteLength(password, 'utf8') > MAX_PASSWORD_BYTES) {
      return badRequest(res, 'Password is too long.');
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    let user;
    try {
      user = await User.create({ name, email, passwordHash });
    } catch (error) {
      if (error?.code === 11000) {
        return res.status(409).json({ message: 'An account with this email already exists.' });
      }
      throw error;
    }

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
    const email = asString(req.body?.email).trim().toLowerCase();
    const password = asString(req.body?.password);

    if (!email || !password) {
      return badRequest(res, 'Email and password are required.');
    }

    if (Buffer.byteLength(password, 'utf8') > 1024) {
      return res.status(401).json({ message: 'Incorrect email or password.' });
    }

    const user = await User.findOne({ email }).select('+passwordHash');

    if (user?.lockUntil && user.lockUntil > new Date()) {
      return res.status(429).json({ message: 'Too many failed attempts. Try again in a few minutes.' });
    }

    const isValidPassword = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);

    if (!user || !isValidPassword) {
      if (user) {
        user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
        if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
          user.lockUntil = new Date(Date.now() + LOCK_DURATION_MS);
          user.failedLoginAttempts = 0;
        }
        await user.save();
      }
      return res.status(401).json({ message: 'Incorrect email or password.' });
    }

    if (user.failedLoginAttempts || user.lockUntil) {
      user.failedLoginAttempts = 0;
      user.lockUntil = null;
      await user.save();
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

/** Invalidates every token issued so far for this account (all devices). */
const logoutAll = async (req, res, next) => {
  try {
    req.user.tokenVersion = (req.user.tokenVersion || 0) + 1;
    await req.user.save();
    return res.json({ ok: true });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  login,
  logoutAll,
  register,
};
