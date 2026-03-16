import type { Metadata, Viewport } from "next";

import { PwaProvider } from "@/components/providers/pwa-provider";
import { withBasePath } from "@/lib/base-path";

import "./globals.css";

const appName = "2cents";
const appDescription =
  "A local-first budgeting and reconciliation app for calm monthly money reviews.";
const manifestPath = withBasePath("/manifest.webmanifest");
const iconSvgPath = withBasePath("/icon.svg");
const appleIconPath = withBasePath("/pwa/apple-touch-icon.png");

export const metadata: Metadata = {
  applicationName: appName,
  manifest: manifestPath,
  title: {
    default: appName,
    template: `%s | ${appName}`,
  },
  description: appDescription,
  icons: {
    apple: appleIconPath,
    icon: [
      {
        rel: "icon",
        type: "image/png",
        sizes: "192x192",
        url: withBasePath("/pwa/icon-192.png"),
      },
      {
        rel: "icon",
        type: "image/svg+xml",
        url: iconSvgPath,
      },
    ],
    shortcut: iconSvgPath,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: appName,
  },
  formatDetection: {
    address: false,
    email: false,
    telephone: false,
  },
};

export const viewport: Viewport = {
  colorScheme: "light",
  initialScale: 1,
  themeColor: "#f6f1e7",
  width: "device-width",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-canvas text-ink min-h-screen antialiased">
        <PwaProvider>{children}</PwaProvider>
      </body>
    </html>
  );
}
