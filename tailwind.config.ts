import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Clarity brand palette — quiet luxury, wearable-art product
        charcoal: {
          DEFAULT: '#1F1E1C',
          50: '#F4F3F1',
          100: '#E2E0DC',
          200: '#C2BFB6',
          300: '#928D7F',
          400: '#5A554A',
          500: '#1F1E1C',
        },
        navy: {
          DEFAULT: '#1F2D4A',
          50: '#EEF1F7',
          100: '#D6DCE9',
          200: '#9CA8C2',
          300: '#5C6C8E',
          400: '#324466',
          500: '#1F2D4A',
        },
        sage: {
          DEFAULT: '#A8B89C',
          50: '#F1F4EE',
          100: '#E2E8DB',
          200: '#C7D2BB',
          300: '#A8B89C',
          400: '#869A78',
          500: '#65795B',
        },
        clay: {
          DEFAULT: '#C58A60',
          50: '#F8EFE7',
          100: '#EFD9C5',
          200: '#E0B68F',
          300: '#C58A60',
          400: '#A56A40',
          500: '#7E4F2D',
        },
        // Warm white surfaces
        paper: {
          DEFAULT: '#F7F1E7',
          50: '#FFFCF6',
          100: '#FAF6EE',
          200: '#F7F1E7',
          300: '#EEE6D5',
        },
      },
      fontFamily: {
        // Injected via next/font in app/layout.tsx as CSS vars
        serif: ['var(--font-dm-serif)', 'Georgia', 'serif'],
        sans: ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '0.5rem',
        lg: '0.75rem',
        xl: '1rem',
      },
      boxShadow: {
        soft: '0 1px 2px rgba(31,30,28,0.04), 0 4px 16px rgba(31,30,28,0.06)',
      },
    },
  },
  plugins: [],
};

export default config;
