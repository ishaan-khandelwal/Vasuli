export const formatCurrency = (amount = 0) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);

export const formatDate = (date) =>
  new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

export const sanitizePhone = (phone = '', countryCode = '91') => {
  const cleaned = `${phone}`.replace(/[^\d]/g, '');
  if (!cleaned) return '';
  if (cleaned.startsWith(countryCode)) return cleaned;
  return `${countryCode}${cleaned.replace(/^0+/, '')}`;
};

export const normalizePhoneInput = (phone = '', countryCode = '91') => {
  const cleaned = `${phone}`.replace(/[^\d]/g, '');
  if (!cleaned) return '';
  if (cleaned.startsWith(countryCode) && cleaned.length > 10) {
    return cleaned.slice(countryCode.length);
  }
  return cleaned.replace(/^0+/, '');
};

export const formatPhoneDisplay = (phone = '', countryCode = '91') => {
  const normalized = normalizePhoneInput(phone, countryCode);
  return normalized || 'No phone';
};

export const getInitials = (name = '') =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');
