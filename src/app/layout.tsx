import type { Metadata, Viewport } from "next";
import { Inter, Orbitron } from "next/font/google";
import { Analytics } from '@vercel/analytics/next';
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Verse | Next-Gen Superhero OS",
  description: "An ultra-premium cinematic AI chatbot inspired by Spider-Man and Jarvis. Experience the future of AI operating systems.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${orbitron.variable} dark`}>
      <body className="antialiased bg-black text-white">
        {children}
        <Analytics />
      </body>
    </html>
  );
}

