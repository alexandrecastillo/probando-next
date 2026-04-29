import type { Metadata } from "next";
import { Geist, Geist_Mono, Playwrite_GB_S } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const playwriteGB = Playwrite_GB_S({
  variable: "--font-handwriting",
  subsets: ["latin"],
  weight: ["100", "200", "300", "400"],
});

export const metadata: Metadata = {
  title: "Regalo de Boda - Briana y Alexandre",
  description: "Envía un regalo de boda a Briana y Alexandre",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} ${playwriteGB.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background">{children}</body>
    </html>
  );
}
