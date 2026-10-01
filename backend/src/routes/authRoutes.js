const express = require('express');
const { login, logoutAll, register } = require('../controllers/authController');
const { authMiddleware } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiters');

const router = express.Router();

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/logout-all', authMiddleware, logoutAll);

module.exports = router;
