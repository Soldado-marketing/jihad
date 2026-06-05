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
        ink: '#111827',
        canvas: '#eef3f8',
        panel: '#ffffff',
        line: '#dbe5ef',
        focus: '#2563eb',
        accent: '#0d9488',
        muted: '#64748b',
        soft: '#f8fafc',
        ocean: '#2563eb',
        warning: '#b45309',
        danger: '#b91c1c',
      },
      boxShadow: {
        shell: '0 22px 70px -46px rgba(15, 23, 42, 0.55)',
        card: '0 16px 40px -30px rgba(15, 23, 42, 0.6)',
      },
    },
  },
  plugins: [],
};

export default config;
