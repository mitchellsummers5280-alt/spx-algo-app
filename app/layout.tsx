import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SPICE – SPX Algo Terminal",
  description: "Brian's personal SPX algorithmic trading assistant.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-screen bg-black text-zinc-100 antialiased">
        {children}
      </body>
    </html>
  );
}
