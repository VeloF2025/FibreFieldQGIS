// Root layout for FibreField
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'FibreField - Fiber Optic Field Data Collection',
  description: 'Progressive Web App for fiber optic pole installation and data collection in the field',
  keywords: ['fiber optic', 'field data', 'pole installation', 'PWA'],
  authors: [{ name: 'FibreFlow Team' }],
  creator: 'FibreFlow',
  publisher: 'FibreFlow',
  
  // PWA metadata
  manifest: '/manifest.json',
  
  // Open Graph
  openGraph: {
    type: 'website',
    title: 'FibreField',
    description: 'Fiber Optic Field Data Collection',
    siteName: 'FibreField',
  },
  
  // Apple PWA
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'FibreField',
  },
  
  // Microsoft PWA
  other: {
    'msapplication-TileColor': '#3b82f6',
    'msapplication-config': '/browserconfig.xml',
  },
};

import { Providers } from '@/components/providers/providers';

// Next.js 15 requires separate viewport export
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#3b82f6',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* PWA links */}
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        
        {/* Capacitor meta for mobile apps */}
        <meta name="format-detection" content="telephone=no" />
        <meta name="msapplication-tap-highlight" content="no" />
      </head>
      <body className={inter.className}>
        <div id="root">
          <Providers>
            {children}
          </Providers>
        </div>
        
        {/* Service worker registration script */}
        <script dangerouslySetInnerHTML={{
          __html: `
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js')
                  .then(function(registration) {
                    console.log('SW registered: ', registration);
                  })
                  .catch(function(registrationError) {
                    console.log('SW registration failed: ', registrationError);
                  });
              });
            }
          `
        }} />
      </body>
    </html>
  );
}
