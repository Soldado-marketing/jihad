import type { Config } from 'tailwindcss';
import defaultTheme from 'tailwindcss/defaultTheme';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
    './styles/**/*.css',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          deep: '#070f26',
          navy: '#2a2952',
          gold: '#dcaf73',
          sand: '#f9ca8d',
          white: '#fcfcfc',
          cream: '#f7efe5',
        },
        surface: {
          50: '#f9f8f6',
          100: '#f4efe8',
          200: '#e8dfd4',
          500: '#756b74',
          700: '#3e3954',
          900: '#15172d',
        },
        success: {
          50: '#eefcf4',
          100: '#d0f8dd',
          600: '#12874c',
          700: '#0e653a',
        },
        danger: {
          50: '#fef1f1',
          100: '#ffd8d8',
          600: '#c53d3d',
          700: '#962a2a',
        },
        warning: {
          50: '#fff8eb',
          100: '#ffe8bd',
          600: '#b17711',
          700: '#80530b',
        },
      },
      boxShadow: {
        soft: '0 24px 70px -42px rgba(7, 15, 38, 0.45)',
      },
      fontFamily: {
        sans: ['var(--font-manrope)', ...defaultTheme.fontFamily.sans],
        display: ['var(--font-belleza)', ...defaultTheme.fontFamily.serif],
        mono: ['var(--font-jetbrains-mono)', ...defaultTheme.fontFamily.mono],
      },
      backgroundImage: {
        'brand-radial':
          'radial-gradient(circle at top right, rgba(249, 202, 141, 0.2), transparent 28%), radial-gradient(circle at bottom left, rgba(220, 175, 115, 0.12), transparent 24%)',
      },
    },
  },
  plugins: [],
};

export default config;
