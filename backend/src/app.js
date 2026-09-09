require('dotenv').config();

const cors = require('cors');
const express = require('express');
const path = require('path');
const authRoutes = require('./routes/authRoutes');
const appDataRoutes = require('./routes/appDataRoutes');
const adminRoutes = require('./routes/adminRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const { connectToDatabase } = require('./config/db');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(
  cors({
    origin: true,
  })
);
app.use(express.json({ limit: '2mb' }));

if (process.env.NODE_ENV !== 'production') {
  app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
}

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    service: 'vasuli-backend',
    timestamp: new Date().toISOString(),
  });
});

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
