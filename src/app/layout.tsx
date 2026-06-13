import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Newsreader } from 'next/font/google';

import { HeaderShell } from '@/components/layout/header-shell';
import { SiteHeader } from '@/components/layout/site-header';
import './globals.css';

const serif = Newsreader({
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap'
});

export const metadata: Metadata = {
  title: 'Choose Your Own',
  description: 'A collaborative, branching choose-your-own-adventure story site.'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={serif.variable}>
      <body>
        <HeaderShell>
          <SiteHeader />
        </HeaderShell>
        {children}
      </body>
    </html>
  );
}
