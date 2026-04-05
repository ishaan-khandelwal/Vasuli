import * as Linking from 'expo-linking';
import { sanitizePhone } from './formatters';

const stripEmoji = (value = '') =>
  `${value}`
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, '')
    .replace(/[\u{2600}-\u{27BF}]/gu, '')
    .replace(/[\uFE0F\u200D]/gu, '')
    .replace(/[^\S\r\n]{2,}/g, ' ')
    .trim();

const applyTemplate = (
  template,
  {
    name = '',
    amount = '',
    groupName = '',
    category = '',
    organizerName = '',
  }
) =>
  stripEmoji(
    template
      .replace(/\[Name\]/g, name)
      .replace(/\[Amount\]/g, amount)
      .replace(/\[GroupName\]/g, groupName)
      .replace(/\[Category\]/g, category)
      .replace(/\[OrganizerName\]/g, organizerName)
  );

export const buildReminderMessage = ({
  template,
  name,
  amount,
  groupName,
  category,
  organizerName,
}) =>
  applyTemplate(template, {
    name,
    amount,
    groupName,
    category,
    organizerName,
  });

export const buildSettlementConfirmationMessage = ({
  name,
  amount,
  groupName,
  category,
  organizerName,
}) =>
  applyTemplate(
    'Hi [Name], your payment of [Amount] for [GroupName] has been received. Your [Category] balance is now settled. Thank you. - [OrganizerName]',
    {
      name,
      amount,
      groupName,
      category,
      organizerName,
    }
  );

export const openWhatsApp = async ({ phone, message, countryCode }) => {
  const sanitized = sanitizePhone(phone, countryCode);
  if (!sanitized) {
    throw new Error('Phone number missing');
  }
  const url = `https://wa.me/${sanitized}?text=${encodeURIComponent(message)}`;
  await Linking.openURL(url);
};
