import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies, headers } from "next/headers";
import { brandConfig } from "@/config/brand";
import { ConsentBanner } from "@/components/tracking/ConsentBanner";
import { getCookieConsentRegionMode } from "@/lib/tracking/consent";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: `${brandConfig.name} - Deja de perder ventas en WhatsApp`,
  description: brandConfig.tagline,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headerStore = await headers();
  const cookieStore = await cookies();
  const cookieConsentRegionMode = getCookieConsentRegionMode({ headers: headerStore, cookies: cookieStore });

  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full scroll-smooth antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <ConsentBanner regionMode={cookieConsentRegionMode} />
      </body>
    </html>
  );
}
