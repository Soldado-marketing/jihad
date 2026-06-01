import type { Metadata } from 'next';
import { Belleza, JetBrains_Mono, Manrope } from 'next/font/google';
import type { ReactNode } from 'react';

import '@/styles/globals.css';

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
});

const belleza = Belleza({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-belleza',
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
});

export const metadata: Metadata = {
  title: 'SH Investments Workflow',
  description:
    'Internal bilingual social media workflow for SH Investments with review and manual publishing package generation.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="de">
      <body
        className={`${manrope.variable} ${belleza.variable} ${jetBrainsMono.variable} font-sans`}
      >
        {children}
      </body>
    </html>
  );
}
