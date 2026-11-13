import type { Metadata, Viewport } from 'next';
import { Google_Sans } from 'next/font/google';
import Script from 'next/script';
import { THEME_BOOT_SCRIPT } from '@/lib/themes';
import './globals.css';

const googleSans = Google_Sans({
  variable: '--font-app-sans',
  subsets: ['latin', 'malayalam'],
  weight: 'variable',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Nadi — The pulse of your clinic',
    template: '%s · Nadi',
  },
  description:
    'Patient history, report scans, online booking, token queue, UPI billing and clinic accounts — on phone and computer.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f6f6f4' },
    { media: '(prefers-color-scheme: dark)', color: '#0b0b0c' },
  ],
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${googleSans.variable} h-full antialiased`}
    >
      <body className="min-h-dvh">
        <Script id="theme-boot" strategy="beforeInteractive">
          {THEME_BOOT_SCRIPT}
        </Script>
        {children}
      </body>
    </html>
  );
}
