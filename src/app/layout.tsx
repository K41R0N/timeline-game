import type { Metadata, Viewport } from "next";
import { Big_Shoulders, Onest } from "next/font/google";
import "./globals.css";

// Names and numerals on the cards; set at the display optical size in globals.css.
const display = Big_Shoulders({ subsets: ["latin"], axes: ["opsz"], variable: "--font-display", display: "swap" });
// Everything read as a sentence.
const body = Onest({ subsets: ["latin"], variable: "--font-body", display: "swap" });

export const metadata: Metadata = {
  title: "History Links - Timeline Connection Game",
  description: "Connect historical figures through their contemporaries to bridge gaps across time",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#FFFFF0",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
