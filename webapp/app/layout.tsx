import type { Metadata } from "next";
import Script from "next/script";
import { TelegramProvider } from "@/components/providers/TelegramProvider";
import { TelegramThemeClient } from "@/components/TelegramThemeClient";
import { WebAppShell } from "@/components/WebAppShell";
import "./globals.css";

export const metadata: Metadata = {
  title: "AVTO-PRO — Usta",
  description: "Ko'chma avtoservis — yangi buyurtma",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uz">
      <body className="min-h-screen antialiased font-sans">
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
        />
        <TelegramThemeClient />
        <TelegramProvider>
          <WebAppShell>{children}</WebAppShell>
        </TelegramProvider>
      </body>
    </html>
  );
}
