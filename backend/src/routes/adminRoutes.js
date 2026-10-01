const express = require('express');
const { getAllUsers, getUserDetail } = require('../controllers/adminController');
const { adminAuthMiddleware } = require('../middleware/adminAuth');

const router = express.Router();

// Every admin route requires the ADMIN_API_KEY header (disabled entirely when unset).
router.use(adminAuthMiddleware);

/** GET /api/admin/users?limit=50&page=1 */
router.get('/users', getAllUsers);

/** GET /api/admin/users/:userId */
router.get('/users/:userId', getUserDetail);

module.exports = router;
