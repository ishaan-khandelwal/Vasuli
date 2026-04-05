const defaultMessage = 'Hi [Name], this is a reminder for [Amount] from [GroupName].';

const createDefaultProfile = (name = 'You') => ({
  name: name || 'You',
  defaultCountryCode: '91',
  messageTemplate: defaultMessage,
  autoRemindersEnabled: false,
  autoReminderIntervalDays: 1,
  autoReminderTime: '09:00',
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
