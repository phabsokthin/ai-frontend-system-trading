import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "./components/Sidebar";
import Footer from "./components/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GoldPilot - AI Trading System",
  description: "AI-Powered Gold Spot (XAU/USD) algorithmic trading system with MetaTrader 5 execution.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#0b1120] text-[#d1d4dc]">
        <div className="app-shell">
          <Sidebar />
          <div className="main-content">
            {children}
            <Footer />
          </div>
        </div>
      </body>
    </html>
  );
}
