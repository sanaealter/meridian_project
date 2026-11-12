import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { UserNav } from "@/components/user-nav";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Meridian: osu! map commissions", template: "%s | Meridian" },
  description:
    "Order custom osu! beatmaps from verified mappers. Payment is held until you approve the map.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&family=Unbounded:wght@500;700&display=swap"
        />
      </head>
      <body className="min-h-full flex flex-col">
        <header className="border-b border-line">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-4">
            <Link href="/" className="flex items-center gap-2 font-display text-lg font-bold">
              <span aria-hidden className="inline-block size-4 rounded-full border-2 border-cue" />
              Meridian
            </Link>
            <nav className="order-last flex w-full gap-5 text-muted sm:order-none sm:w-auto">
              <Link href="/sellers" className="hover:text-ink">
                Find a mapper
              </Link>
              <Link href="/stats" className="hover:text-ink">
                Statistics
              </Link>
            </nav>
            <div className="ml-auto">
              <Suspense fallback={<span className="text-muted">…</span>}>
                <UserNav />
              </Suspense>
            </div>
          </div>
        </header>

        <main className="flex-1">
          <Suspense fallback={<div className="mx-auto max-w-6xl px-4 py-16 text-muted">Loading…</div>}>
            {children}
          </Suspense>
        </main>

        <footer className="border-t border-line">
          <div className="mx-auto flex max-w-6xl flex-wrap gap-x-6 gap-y-2 px-4 py-6 text-sm text-muted">
            <span>Meridian is a community project and is not affiliated with ppy Pty Ltd.</span>
            <Link href="/stats" className="hover:text-ink">
              Open statistics
            </Link>
          </div>
        </footer>
      </body>
    </html>
  );
}
