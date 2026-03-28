const express = require('express');
const {
  getAppData,
  resetAppData,
  updateGroups,
  updatePersonalLoans,
  updateProfile,
} = require('../controllers/appDataController');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);
router.get('/me', getAppData);
router.put('/groups', updateGroups);
router.put('/personal-loans', updatePersonalLoans);
router.put('/profile', updateProfile);
router.post('/reset', resetAppData);

module.exports = router;
