import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import "./dashboard/styles/design-improvements.css";
import { cn } from "@/lib/utils";
import RootLayoutClient from "./components/RootLayoutClient";
import ClientProviders from "./components/ClientProviders";
import DynamicTitle from "@/components/DynamicTitle";
import { SettingsProvider } from "@/lib/settings-context";

const cairo = Cairo({ 
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-cairo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "نظام إدارة المراكز التدريبية",
  description: "نظام شامل لإدارة المراكز التدريبية والمتدربين",
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  manifest: '/site.webmanifest',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning className={cairo.variable}>
      <body className={`min-h-screen bg-background font-cairo antialiased ${cairo.className}`}>
        <SettingsProvider>
          <DynamicTitle />
          <ClientProviders>
            <RootLayoutClient>
              {children}
            </RootLayoutClient>
          </ClientProviders>
        </SettingsProvider>
      </body>
    </html>
  );
}
