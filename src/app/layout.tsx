import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { fal } from "@fal-ai/client";

// Configure fal client with the API key from public environment variable
fal.config({
  credentials: process.env.NEXT_PUBLIC_FAL_KEY
});

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Guess It",
  description: "A Game of Guessing",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
