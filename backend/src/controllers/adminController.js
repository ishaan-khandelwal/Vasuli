const User = require('../models/User');
const AppData = require('../models/AppData');


const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });

    const safeUsers = users.map(user => user.toSafeObject());

    return res.json({
      count: safeUsers.length,
      users: safeUsers,
    });
  } catch (error) {
    return next(error);
  }
};


const getUserDetail = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const appData = await AppData.findOne({ user: userId });

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
