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
        brand: '#12233d',
        ink: '#101828',
        canvas: '#f4f7fb',
        panel: '#ffffff',
        line: '#d9e2ec',
        focus: '#0f62fe',
        accent: '#0b6fa4',
        muted: '#667085',
        soft: '#f8fafc',
        ocean: '#1d4ed8',
        warning: '#b4501f',
        danger: '#c42827',
        navy: '#12233d',
        'navy-soft': '#1e293b',
        // Aliases for the names the auth, settings and user-menu screens use.
        // They were never defined, so those classes produced no CSS (the
        // sign-in button rendered as plain text). Each maps to the palette above.
        primary: '#12233d',
        'primary-foreground': '#ffffff',
        destructive: '#b42318',
        surface: '#ffffff',
        foreground: '#101828',
        background: '#ffffff',
        border: '#d9e2ec',
        // Soldado brand (proposal): sky = action fills, flame = waiting/attention, signal = brand mark/critical.
        sky: '#3db3f4',
        'sky-soft': '#e7f5fd',
        flame: '#f87a45',
        'flame-soft': '#fef0e8',
        signal: '#f33f3e',
        'signal-soft': '#fdecec',
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
