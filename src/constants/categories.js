export const categories = [
  { key: 'Trip', label: 'Trip', emoji: '\u{1F3D5}\uFE0F', color: '#60A5FA' },
  { key: 'Dinner', label: 'Dinner', emoji: '\u{1F37D}\uFE0F', color: '#F59E0B' },
  { key: 'Party', label: 'Party', emoji: '\u{1F389}', color: '#F472B6' },
  { key: 'Movie', label: 'Movie', emoji: '\u{1F3AC}', color: '#A78BFA' },
  { key: 'Shopping', label: 'Shopping', emoji: '\u{1F6CD}\uFE0F', color: '#34D399' },
  { key: 'Other', label: 'Other', emoji: '\u{1F4E6}', color: '#94A3B8' },
];

export const categoryMap = categories.reduce((acc, category) => {
  acc[category.key] = category;
  return acc;
}, {});
