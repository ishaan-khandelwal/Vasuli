import { Platform } from 'react-native';
import * as Contacts from 'expo-contacts';
import { normalizePhoneInput } from './formatters';

const CONTACT_FIELDS = [
  Contacts.Fields.Name,
  Contacts.Fields.FirstName,
  Contacts.Fields.LastName,
  Contacts.Fields.PhoneNumbers,
];

const getContactName = (contact = {}) => {
  const fullName = contact.name?.trim();
  if (fullName) return fullName;

  const fallbackName = [contact.firstName, contact.lastName]
    .filter(Boolean)
    .join(' ')
    .trim();

  return fallbackName;
};

const getContactPhone = (contact = {}) => {
  const selectedPhone = contact.phoneNumbers
    ?.map((entry) => normalizePhoneInput(entry?.number || ''))
    .find(Boolean);

  return selectedPhone || '';
};

const getCompleteContact = async (contact) => {
  if (!contact?.id || getContactPhone(contact)) {
    return contact;
  }

  try {
    const fullContact = await Contacts.getContactByIdAsync(contact.id, CONTACT_FIELDS);
    return fullContact || contact;
  } catch (error) {
    return contact;
  }
};

export const pickPhoneContact = async () => {
  if (Platform.OS === 'web') {
    throw new Error('Contacts are available only on the mobile app.');
  }

  const available = await Contacts.isAvailableAsync();
  if (!available) {
    throw new Error('Contacts are not available on this device.');
  }

  if (Platform.OS === 'android') {
    const permission = await Contacts.requestPermissionsAsync();
    if (!permission.granted) {
      throw new Error('Allow contacts access to pick a phone number.');
    }
  }

  const selectedContact = await Contacts.presentContactPickerAsync();
  if (!selectedContact) {
    return null;
  }

  const contact = await getCompleteContact(selectedContact);
  const phone = getContactPhone(contact);

  if (!phone) {
    throw new Error(`${getContactName(contact) || 'This contact'} has no phone number.`);
  }

  return {
    name: getContactName(contact),
    phone,
  };
};
