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
        ink: '#17202a',
        canvas: '#f7f9fb',
        panel: '#ffffff',
        line: '#d9e2ec',
        focus: '#2563eb',
        accent: '#0f766e',
        warning: '#b45309',
        danger: '#b91c1c',
      },
      boxShadow: {
        shell: '0 18px 45px -30px rgba(15, 23, 42, 0.45)',
      },
    },
  },
  plugins: [],
};

export default config;
