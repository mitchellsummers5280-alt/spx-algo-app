import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "SPICE",
  description: "SPICE — SPX Intraday Context Engine",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-black text-white">
        <header className="border-b border-slate-800 bg-black/90">
          <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <Link href="/" className="text-lg font-bold tracking-wide">
              SPICE
            </Link>

            <div className="flex gap-4 text-sm">
              <Link href="/spx">SPICE View</Link>
              {/* Future expansion: <Link href="/signals">Signals</Link> */}
            </div>
          </nav>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
