import * as Linking from 'expo-linking';
import { sanitizePhone } from './formatters';

export const buildReminderMessage = ({
  template,
  name,
  amount,
  groupName,
  category,
  organizerName,
}) =>
  template
    .replace(/\[Name\]/g, name)
    .replace(/\[Amount\]/g, amount)
    .replace(/\[GroupName\]/g, groupName)
    .replace(/\[Category\]/g, category)
    .replace(/\[OrganizerName\]/g, organizerName);

export const openWhatsApp = async ({ phone, message, countryCode }) => {
  const sanitized = sanitizePhone(phone, countryCode);
  const url = `https://wa.me/${sanitized}?text=${encodeURIComponent(message)}`;
  await Linking.openURL(url);
};
