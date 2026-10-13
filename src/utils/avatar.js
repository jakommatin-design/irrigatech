export function getUserInitials(user) {
  const name = String(user?.name || user?.email || '').trim();
  if (!name) return '??';
  const parts = name.includes('@') ? name.split('@')[0].split(/[._-]+/) : name.split(/\s+/);
  return parts.filter(Boolean).slice(0, 2).map(part => Array.from(part)[0]?.toUpperCase() || '').join('') || '??';
}

export function isProfilePhoto(value) {
  return typeof value === 'string' && /^https:\/\//i.test(value);
}
