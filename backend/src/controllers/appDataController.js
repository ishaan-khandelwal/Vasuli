const AppData = require('../models/AppData');
const { createDefaultAppData, createDefaultProfile } = require('../utils/defaults');
const { isPlainObject, sanitizeProfile, sanitizeRecordList } = require('../utils/sanitize');

const MAX_GROUPS = 200;
const MAX_PERSONAL_LOANS = 1000;

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
    const groups = sanitizeRecordList(req.body?.groups, 'groups', MAX_GROUPS);

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
    const personalLoans = sanitizeRecordList(req.body?.personalLoans, 'personalLoans', MAX_PERSONAL_LOANS);

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
    const profile = req.body?.profile;

    if (!isPlainObject(profile)) {
      return res.status(400).json({ message: 'profile must be an object.' });
    }

    const appData = await ensureAppDataForUser(req.user);
    appData.profile = sanitizeProfile(profile, createDefaultProfile(req.user.name));
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
