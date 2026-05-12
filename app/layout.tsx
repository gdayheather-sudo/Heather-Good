import type { Metadata, Viewport } from 'next';
import { DM_Serif_Display, DM_Sans } from 'next/font/google';
import { Toaster } from '@/components/ui/toast';
import './globals.css';

const dmSerif = DM_Serif_Display({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-dm-serif',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Clarity — voice-first SOPs',
  description:
    'Walk through a process talking and snapping photos. Get back a clean, structured SOP.',
  applicationName: 'Clarity',
};

export const viewport: Viewport = {
  themeColor: '#F7F1E7',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${dmSerif.variable} ${dmSans.variable}`}>
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
