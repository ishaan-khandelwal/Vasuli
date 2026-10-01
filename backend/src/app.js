require('dotenv').config();

const cors = require('cors');
const express = require('express');
const helmet = require('helmet');
const mongoose = require('mongoose');
const path = require('path');
const authRoutes = require('./routes/authRoutes');
const appDataRoutes = require('./routes/appDataRoutes');
const adminRoutes = require('./routes/adminRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const { connectToDatabase } = require('./config/db');
const { errorHandler } = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiters');
const { getJwtSecret, isProduction } = require('./utils/auth');

// Fail fast on a weak/missing secret in production instead of at the first login.
getJwtSecret();

// Treat query-string filters as literal values, never as MongoDB operators.
mongoose.set('sanitizeFilter', true);

const app = express();

app.disable('x-powered-by');
// Behind Vercel's proxy: required so rate limiting sees the real client IP.
app.set('trust proxy', 1);
app.set('query parser', 'simple');

app.use(helmet());

/**
 * The native apps do not send an Origin header, so they are unaffected by CORS. Browsers are
 * only allowed from origins listed in CORS_ORIGINS (comma separated); in development
 * localhost origins are also accepted.
 */
const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      if (!isProduction() && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    methods: ['GET', 'POST', 'PUT'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 600,
  })
);

app.use(express.json({ limit: '1mb' }));

if (!isProduction()) {
  app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.use('/api', apiLimiter);

app.use('/api', async (req, res, next) => {
  try {
    await connectToDatabase();
    return next();
  } catch (error) {
    return next(error);
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/app-data', appDataRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found.' });
});

app.use(errorHandler);

module.exports = app;
