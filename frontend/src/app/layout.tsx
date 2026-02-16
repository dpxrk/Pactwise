import type { Metadata } from "next";

import "./globals.css";
import { fontVariables } from './fonts';
import { Providers } from './providers';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  title: "Pactwise",
  description: "An application to help manage your contracts and vendors",
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-icon.png' },
    ],
  },
  openGraph: {
    title: 'Pactwise - Contract Management Platform',
    description: 'Intelligent contract and vendor management platform',
    images: ['/og-image.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pactwise',
    description: 'Intelligent contract and vendor management platform',
    images: ['/twitter-image.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={fontVariables}>
      <body className="font-sans">
        {/* Skip Navigation Link for Accessibility (WCAG 2.4.1) */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-purple-900 focus:text-white focus:rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          Skip to main content
        </a>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}