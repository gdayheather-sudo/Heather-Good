// Shared brand tokens. Mirror these into Tailwind config and exported docs.
export const BRAND = {
  colors: {
    warm: '#F7F4EF',
    charcoal: '#2E2E2E',
    navy: '#3F5366',
    sage: '#8FA79A',
    clay: '#C97E63',
  },
  fonts: {
    serif: 'DM Serif Display',
    sans: 'DM Sans',
  },
  name: 'Clarity Hub',
  tagline: 'Messy in, clean system out.',
} as const;
