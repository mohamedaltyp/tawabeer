import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import NgrokBypass from "./NgrokBypass";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "دورك — نظام إدارة الطوابير الذكي",
  description: "نظام إدارة قوائم الانتظار الرقمية للمحلات والخدمات",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="min-h-screen bg-gray-50 font-sans antialiased">
        <NgrokBypass />
        {children}
      </body>
    </html>
  );
}
