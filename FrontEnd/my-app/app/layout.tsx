import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/notifications/Toast";
import { ThemeProvider } from "@/app/providers/ThemeProvider";
import { WalletModal } from "@/components/wallet/WalletModal";
import { WalletProvider } from "@/context/WalletContext";
import { AnalyticsProvider } from "@/app/providers/AnalyticsProvider";
import { ConsentBanner } from "@/components/analytics/ConsentBanner";
import { SkipToContent } from "@/components/a11y/SkipToContent";
import { A11yAnnouncerProvider } from "@/components/a11y/A11yAnnouncer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "StellarEarn - Quest-Based Earning Platform",
  description:
    "Complete quests, earn rewards, and build your on-chain reputation with Stellar",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const themeInitScript = `
    (function() {
      try {
        var stored = localStorage.getItem('stellar_earn_theme');
        var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        var theme = stored === 'dark' || stored === 'light' ? stored : (prefersDark ? 'dark' : 'light');
        var root = document.documentElement;
        root.classList.toggle('dark', theme === 'dark');
        root.setAttribute('data-theme', theme);
        root.style.colorScheme = theme;
      } catch (e) {}
    })();
  `;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <A11yAnnouncerProvider>
            <WalletProvider>
              <AnalyticsProvider>
                <ToastProvider>
                  <SkipToContent />
                  {children}
                  <ConsentBanner />
                  <WalletModal />
                </ToastProvider>
              </AnalyticsProvider>
            </WalletProvider>
          </A11yAnnouncerProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
