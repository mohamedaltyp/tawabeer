import type { Metadata } from "next";
import { Geist, Geist_Mono, Cairo } from "next/font/google";
import "./globals.css";
import NgrokBypass from "./NgrokBypass";
import OfflineIndicator from "./OfflineIndicator";
import ServiceWorkerRegister from "./ServiceWorkerRegister";
import { ThemeProvider } from "@/lib/theme";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const cairo = Cairo({ variable: "--font-cairo", subsets: ["arabic", "latin"], weight: ["400", "500", "600", "700", "800"] });

export const metadata: Metadata = {
  title: "طوابير — نظام إدارة الطوابير الذكي",
  description: "نظام إدارة قوائم الانتظار الرقمية للمنشآت والخدمات",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "طوابير",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={`${geistSans.variable} ${geistMono.variable} ${cairo.variable}`} suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="طوابير" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#0B0E16" />
      </head>
      <body className="min-h-screen antialiased">
        <ThemeProvider>
          <ServiceWorkerRegister />
          <NgrokBypass />
          <OfflineIndicator />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
