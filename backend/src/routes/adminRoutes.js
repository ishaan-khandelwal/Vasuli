const express = require('express');
const { getAllUsers, getUserDetail } = require('../controllers/adminController');

const router = express.Router();

/**
 * Route to get a list of all users
 * GET /api/admin/users
 */
router.get('/users', getAllUsers);

/**
 * Route to get specific user and their app data
 * GET /api/admin/users/:userId
 */
router.get('/users/:userId', getUserDetail);

module.exports = router;
