import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "@fontsource/montserrat/200.css";
import "@fontsource/montserrat/300.css";
import "@fontsource/montserrat/400.css";
import "@fontsource/montserrat/500.css";
import "@fontsource/montserrat/600.css";
import "./globals.css";
import "./house-style.css";

export const metadata: Metadata = {
  title: "Huishouden",
  description: "Privé overzicht van inkomsten, uitgaven, budgetten en spaargeld.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Huishouden",
  },
};

export const viewport: Viewport = {
  themeColor: "#0e1114",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="nl" suppressHydrationWarning>
      <head>
        <Script src="/theme-init.js" strategy="beforeInteractive" />
        <link rel="icon" href="/logo/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/logo/icon.svg" />
      </head>
      <body>
        <a href="#hoofdinhoud" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[9999] focus:rounded-md focus:border-2 focus:border-brand focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-brand focus:shadow-lg">
          Ga naar hoofdinhoud
        </a>
        {children}
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js').catch(function() {});
            });
          }
        `}} />
      </body>
    </html>
  );
}
