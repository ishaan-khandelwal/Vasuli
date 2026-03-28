const AppData = require('../models/AppData');
const { createDefaultAppData, createDefaultProfile } = require('../utils/defaults');

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

const normalizeAppDataResponse = (appData, fallbackName) => ({
  groups: appData?.groups || [],
  personalLoans: appData?.personalLoans || [],
  profile: appData?.profile || createDefaultProfile(fallbackName),
});

const getAppData = async (req, res, next) => {
  try {
    const appData = await ensureAppDataForUser(req.user);
    return res.json(normalizeAppDataResponse(appData, req.user.name));
  } catch (error) {
    return next(error);
  }
};

const updateGroups = async (req, res, next) => {
  try {
    const { groups } = req.body;

    if (!Array.isArray(groups)) {
      return res.status(400).json({ message: 'groups must be an array.' });
    }

    const appData = await ensureAppDataForUser(req.user);
    appData.groups = groups;
    await appData.save();

    return res.json({ groups: appData.groups });
  } catch (error) {
    return next(error);
  }
};

const updatePersonalLoans = async (req, res, next) => {
  try {
    const { personalLoans } = req.body;

    if (!Array.isArray(personalLoans)) {
      return res.status(400).json({ message: 'personalLoans must be an array.' });
    }

    const appData = await ensureAppDataForUser(req.user);
    appData.personalLoans = personalLoans;
    await appData.save();

    return res.json({ personalLoans: appData.personalLoans });
  } catch (error) {
    return next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const profile = req.body.profile;

    if (!profile || Array.isArray(profile) || typeof profile !== 'object') {
      return res.status(400).json({ message: 'profile must be an object.' });
    }

    const appData = await ensureAppDataForUser(req.user);
    appData.profile = {
      ...createDefaultProfile(req.user.name),
      ...profile,
    };
    await appData.save();

    return res.json({ profile: appData.profile });
  } catch (error) {
    return next(error);
  }
};

const resetAppData = async (req, res, next) => {
  try {
    const defaults = createDefaultAppData(req.user.name);
    const appData = await ensureAppDataForUser(req.user);

    appData.groups = defaults.groups;
    appData.personalLoans = defaults.personalLoans;
    appData.profile = defaults.profile;
    await appData.save();

    return res.json(normalizeAppDataResponse(appData, req.user.name));
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getAppData,
  resetAppData,
  updateGroups,
  updatePersonalLoans,
  updateProfile,
};
