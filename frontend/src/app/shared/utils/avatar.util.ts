const AVATAR_COLORS = [
  '#e01e5a',
  '#36c5f0',
  '#00b87c',
  '#ecb22e',
  '#6c5ce7',
  '#2eb67d',
  '#0052cc',
  '#f2994a',
  '#9b59b6',
  '#1abc9c'
];

export function avatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export function initials(name: string): string {
  const parts = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  return parts.map((p) => p[0]).join('').toUpperCase() || '?';
}
