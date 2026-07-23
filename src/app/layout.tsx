import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { SITE_NAME, SITE_DESCRIPTION, SITE_URL } from "@/lib/constants";
import { CATEGORY_LABELS, ArticleCategory } from "@/lib/types";
import { getAdSenseClientId } from "@/lib/adsense";
import MobileCategoryNav from "@/components/MobileCategoryNav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: `${SITE_NAME} — Daily Trending Open-Source Tools`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  metadataBase: new URL(SITE_URL),
  verification: {
    google: "hpIpFYfdgSPl618-Rio88ECx5X5-jpaG3ZrgTgYHzLs",
  },
  alternates: {
    types: {
      "application/rss+xml": "/rss.xml",
    },
  },
  openGraph: {
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    siteName: SITE_NAME,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
};

const categories = Object.entries(CATEGORY_LABELS) as [ArticleCategory, string][];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const adsenseClientId = getAdSenseClientId();

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <head>
        {adsenseClientId && (
          <script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClientId}`}
            crossOrigin="anonymous"
          />
        )}
        {/* JSON-LD: WebSite */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: SITE_NAME,
              url: SITE_URL,
              description: SITE_DESCRIPTION,
            }),
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100">
        {/* Header */}
        <header className="border-b border-gray-200 dark:border-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <Link href="/" className="text-xl font-bold tracking-tight hover:text-blue-600 transition-colors">
                {SITE_NAME}
              </Link>
              <nav aria-label="Categories" className="hidden md:flex items-center gap-1">
                {categories.map(([key, label]) => (
                  <Link
                    key={key}
                    href={`/category/${key}`}
                    className="px-3 py-1.5 text-sm rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    {label}
                  </Link>
                ))}
              </nav>
              <MobileCategoryNav categories={categories} />
            </div>
          </div>
        </header>

        {/* Main */}
        <main className="flex-1">{children}</main>

        {/* Footer */}
        <footer className="border-t border-gray-200 dark:border-gray-800 py-8 mt-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-gray-500 dark:text-gray-400">
            <nav aria-label="Footer" className="mb-3 flex flex-wrap justify-center gap-x-5 gap-y-2">
              <Link href="/about" className="hover:text-blue-600">About</Link>
              <Link href="/editorial-policy" className="hover:text-blue-600">Editorial Policy</Link>
              <Link href="/privacy" className="hover:text-blue-600">Privacy</Link>
              <Link href="/contact" className="hover:text-blue-600">Contact</Link>
              <Link href="/rss.xml" className="hover:text-blue-600">RSS</Link>
            </nav>
            <p>&copy; {new Date().getFullYear()} {SITE_NAME}. All rights reserved.</p>
            <p className="mt-1">
              Some pages may display advertising when an approved advertising account is enabled.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
