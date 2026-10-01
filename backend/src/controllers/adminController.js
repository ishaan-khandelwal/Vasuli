const mongoose = require('mongoose');
const User = require('../models/User');
const AppData = require('../models/AppData');

const getAllUsers = async (req, res, next) => {
  try {
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 50));
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);

    const [users, total] = await Promise.all([
      User.find()
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      User.estimatedDocumentCount(),
    ]);

    return res.json({
      count: users.length,
      total,
      page,
      users: users.map((user) => user.toSafeObject()),
    });
  } catch (error) {
    return next(error);
  }
};

const getUserDetail = async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ message: 'Invalid user id.' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const appData = await AppData.findOne({ user: user._id });

    return res.json({
      user: user.toSafeObject(),
      appData: appData || { message: 'No application data found for this user.' },
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getAllUsers,
  getUserDetail,
};
