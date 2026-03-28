const defaultMessage = 'Hi [Name], this is a reminder for [Amount] from [GroupName].';

const createDefaultProfile = (name = 'You') => ({
  name: name || 'You',
  defaultCountryCode: '91',
  messageTemplate: defaultMessage,
});

const createDefaultAppData = (name = 'You') => ({
  groups: [],
  personalLoans: [],
  profile: createDefaultProfile(name),
});

module.exports = {
  createDefaultAppData,
  createDefaultProfile,
};
