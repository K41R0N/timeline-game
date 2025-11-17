import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "History Links - Timeline Connection Game",
  description: "Connect historical figures through their contemporaries to bridge gaps across time",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
