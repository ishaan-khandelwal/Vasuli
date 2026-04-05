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

const getPhoneLabel = (label, index) => {
  const normalizedLabel = `${label || ''}`
    .replace(/_/g, ' ')
    .trim();

  if (!normalizedLabel) {
    return `Number ${index + 1}`;
  }

  return normalizedLabel.charAt(0).toUpperCase() + normalizedLabel.slice(1);
};

const getWebContactName = (contact = {}) => {
  if (Array.isArray(contact.name)) {
    return `${contact.name.find(Boolean) || ''}`.trim();
  }

  return `${contact.name || ''}`.trim();
};

const getWebPhoneOptions = (contact = {}) => {
  const phones = Array.isArray(contact.tel) ? contact.tel : [contact.tel];
  const seenPhones = new Set();

  return phones
    .map((entry, index) => {
      const displayPhone = `${entry || ''}`.trim();
      const phone = normalizePhoneInput(displayPhone);

      if (!phone || seenPhones.has(phone)) {
        return null;
      }

      seenPhones.add(phone);

      return {
        id: `web-contact-${index}-${phone}`,
        label: phones.length > 1 ? `Number ${index + 1}` : 'Phone',
        phone,
        displayPhone: displayPhone || phone,
        isPrimary: index === 0,
      };
    })
    .filter(Boolean);
};

export const getContactPhoneOptions = (contact = {}) => {
  const seenPhones = new Set();

  return (contact.phoneNumbers || [])
    .map((entry, index) => {
      const phone = normalizePhoneInput(entry?.number || '');
      if (!phone || seenPhones.has(phone)) {
        return null;
      }

      seenPhones.add(phone);

      return {
        id: entry?.id || `${contact.id || 'contact'}-${index}-${phone}`,
        label: getPhoneLabel(entry?.label, index),
        phone,
        displayPhone: `${entry?.number || ''}`.trim() || phone,
        isPrimary: Boolean(entry?.isPrimary),
      };
    })
    .filter(Boolean)
    .sort((left, right) => Number(right.isPrimary) - Number(left.isPrimary));
};

const getContactPhone = (contact = {}) => {
  return getContactPhoneOptions(contact)[0]?.phone || '';
};

const pickWebPhoneContact = async () => {
  const contactPicker = typeof navigator !== 'undefined' ? navigator.contacts?.select : undefined;

  if (typeof contactPicker !== 'function') {
    throw new Error('This browser cannot open contacts. Use the Android app or enter the number manually.');
  }

  try {
    const selectedContacts = await contactPicker.call(navigator.contacts, ['name', 'tel'], { multiple: false });
    const selectedContact = selectedContacts?.[0];

    if (!selectedContact) {
      return null;
    }

    const name = getWebContactName(selectedContact);
    const phoneOptions = getWebPhoneOptions(selectedContact);
    const phone = phoneOptions[0]?.phone || '';

    if (!phone) {
      throw new Error(`${name || 'This contact'} has no phone number.`);
    }

    return {
      name,
      phone,
      phoneOptions,
    };
  } catch (error) {
    if (error?.name === 'AbortError') {
      return null;
    }

    if (error?.name === 'NotAllowedError') {
      throw new Error('Allow contact access to pick a phone number.');
    }

    if (error?.name === 'SecurityError') {
      throw new Error('Browser contact access needs a secure HTTPS site.');
    }

    throw error;
  }
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
    return pickWebPhoneContact();
  }

  const available = await Contacts.isAvailableAsync();
  if (!available) {
    throw new Error('Contacts are not available on this device.');
  }

  const permission = await Contacts.requestPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Allow contacts access to pick a phone number.');
  }

  const selectedContact = await Contacts.presentContactPickerAsync();
  if (!selectedContact) {
    return null;
  }

  const contact = await getCompleteContact(selectedContact);
  const phoneOptions = getContactPhoneOptions(contact);
  const phone = phoneOptions[0]?.phone || '';

  if (!phone) {
    throw new Error(`${getContactName(contact) || 'This contact'} has no phone number.`);
  }

  return {
    name: getContactName(contact),
    phone,
    phoneOptions,
  };
};
