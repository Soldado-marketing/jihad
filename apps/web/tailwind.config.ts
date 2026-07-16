import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
    './styles/**/*.css',
  ],
  theme: {
    extend: {
      colors: {
        brand: '#0f766e',
        ink: '#101828',
        canvas: '#f4f7fb',
        panel: '#ffffff',
        line: '#d9e2ec',
        focus: '#0f62fe',
        accent: '#0f766e',
        muted: '#667085',
        soft: '#f8fafc',
        ocean: '#1d4ed8',
        warning: '#b45309',
        danger: '#b42318',
        navy: '#0f172a',
        'navy-soft': '#1e293b',
      },
      boxShadow: {
        shell: '0 24px 80px -52px rgba(15, 23, 42, 0.65)',
        card: '0 18px 50px -36px rgba(15, 23, 42, 0.55)',
        lift: '0 18px 34px -26px rgba(15, 23, 42, 0.5)',
      },
    },
  },
  plugins: [],
};

export default config;
