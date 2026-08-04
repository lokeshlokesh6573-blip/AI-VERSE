import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono, Orbitron } from 'next/font/google';
import { SettingsProvider } from '@/context/SettingsContext';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist',
  subsets: ['latin'],
  display: 'swap',
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap',
});

const orbitron = Orbitron({
  variable: '--font-orbitron',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'AI Verse — Next-Gen AI Assistant',
  description:
    'AI Verse is a premium AI workspace for programming, writing, research, data analysis, image understanding and more — powered by state-of-the-art language models.',
  keywords: ['AI assistant', 'chat AI', 'programming AI', 'next-gen AI', 'AI Verse'],
  authors: [{ name: 'Lokesh' }],
  robots: 'index, follow',
  openGraph: {
    title: 'AI Verse — Next-Gen AI Assistant',
    description: 'A premium AI workspace that rivals ChatGPT, Gemini and Claude.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${orbitron.variable} dark`} suppressHydrationWarning>
      <body className="antialiased">
        <SettingsProvider>
          {children}
        </SettingsProvider>
      </body>
    </html>
  );
}
