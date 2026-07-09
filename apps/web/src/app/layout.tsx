import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "SaveClip - Instagram Downloader",
  description: "Download Instagram videos, photos, reels, stories and IGTV content easily and securely",
  keywords: "instagram downloader, instagram video downloader, instagram photo downloader, instagram reels downloader",
  authors: [{ name: "SaveClip Team" }],
  openGraph: {
    title: "SaveClip - Instagram Downloader",
    description: "Download Instagram videos, photos, reels, stories and IGTV content easily and securely",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "SaveClip - Instagram Downloader",
    description: "Download Instagram videos, photos, reels, stories and IGTV content easily and securely",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
