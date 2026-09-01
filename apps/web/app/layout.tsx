import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import '../styles/globals.css';

/**
 * Every route in this app is behind a token held in localStorage and renders
 * its data client-side, so a static prerender produces an empty shell at best.
 * It also breaks the build: framer-motion (used by PageHeader) calls useContext
 * during React 19's static prerender pass, where the dispatcher is null.
 *
 * Rendering dynamically is both the correct behaviour for an authenticated app
 * and the smallest fix for that failure.
 */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Soldado Platform',
  description: 'Soldado Marketing and Operations Platform',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" dir="ltr">
      <body>{children}</body>
    </html>
  );
}
