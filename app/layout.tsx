import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'BeDelulu - Wake Up Confident',
  description: 'We call you every morning and tell you delusionally confident things you need, until you believe them.',
  generator: 'BeDelulu',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icon-light-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-dark-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    shortcut: '/icon.svg',
    apple: [
      { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'BeDelulu',
  },
  themeColor: '#ffffff',
  metadataBase: new URL('https://bedelulu.com'),
  openGraph: {
    title: 'BeDelulu - Wake Up Confident',
    description: 'We call you every morning and tell you delusionally confident things you need, until you believe them.',
    url: 'https://bedelulu.com',
    siteName: 'BeDelulu',
    images: [
      {
        url: 'https://bedelulu.com/og-image.png?v=2',
        width: 1200,
        height: 630,
        alt: 'BeDelulu - Wake Up Confident',
      },
      {
        url: 'https://bedelulu.com/apple-icon.png?v=2',
        width: 180,
        height: 180,
        alt: 'BeDelulu',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BeDelulu - Wake Up Confident',
    description: 'We call you every morning and tell you delusionally confident things you need, until you believe them.',
    images: ['https://bedelulu.com/og-image.png?v=2'],
  },
  other: {
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
    'apple-touch-icon': '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased`} style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
