import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { TooltipProvider } from '@/components/ui/tooltip';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://hyperfix.app'),
  title: {
    default: 'HyperFix',
    template: '%s | HyperFix',
  },
  description: 'Advanced AI-powered platform for intelligent problem solving and creative design assistance',
  keywords: ['AI', 'design', 'productivity', 'problem solving'],
  authors: [{ name: 'HyperFix' }],
  creator: 'HyperFix',
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    apple: '/apple-icon.png',
  },
  manifest: '/manifest.json',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://hyperfix.app',
    siteName: 'HyperFix',
    title: 'HyperFix - AI-Powered Problem Solving Platform',
    description: 'Advanced AI-powered platform for intelligent problem solving and creative design assistance',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'HyperFix',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HyperFix',
    description: 'Advanced AI-powered platform for intelligent problem solving and creative design assistance',
    images: ['/og-image.png'],
    creator: '@HyperFix',
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        <TooltipProvider>
          {children}
        </TooltipProvider>
      </body>
    </html>
  );
}
