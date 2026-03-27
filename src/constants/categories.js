export const categories = [
  { key: 'Trip', label: 'Trip', emoji: '🏕️', color: '#60A5FA' },
  { key: 'Dinner', label: 'Dinner', emoji: '🍽️', color: '#F59E0B' },
  { key: 'Party', label: 'Party', emoji: '🎉', color: '#F472B6' },
  { key: 'Movie', label: 'Movie', emoji: '🎬', color: '#A78BFA' },
  { key: 'Shopping', label: 'Shopping', emoji: '🛍️', color: '#34D399' },
  { key: 'Other', label: 'Other', emoji: '📦', color: '#94A3B8' },
];

export const categoryMap = categories.reduce((acc, category) => {
  acc[category.key] = category;
  return acc;
}, {});
