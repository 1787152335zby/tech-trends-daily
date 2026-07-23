import { loadAllArticles, getTrendingArticles } from "@/lib/articles";
import type { Metadata } from "next";
import { SITE_DESCRIPTION, SITE_URL } from "@/lib/constants";
import { deduplicateArticlesBySource } from "@/lib/articles";
import { CATEGORY_LABELS } from "@/lib/types";
import ArticleCard from "@/components/ArticleCard";
import AdUnit from "@/components/AdUnit";
import Link from "next/link";

export const metadata: Metadata = {
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: SITE_URL,
  },
};

export default function HomePage() {
  const articles = loadAllArticles().filter(
    (article) => article.indexable !== false,
  );
  const trending = getTrendingArticles(9);
  const trendingSourceIds = new Set(
    trending.map((article) => article.sourceData.id || article.sourceData.url),
  );
  const recent = deduplicateArticlesBySource(
    articles,
    trendingSourceIds,
  ).slice(0, 18);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero */}
      <section className="mb-12 overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-indigo-50 px-6 py-12 text-center dark:border-blue-950 dark:from-blue-950/40 dark:via-gray-950 dark:to-indigo-950/30 sm:px-10">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-blue-700 dark:text-blue-300">
          Practical open-source research
        </p>
        <h1 className="mx-auto mb-4 max-w-3xl text-3xl font-bold tracking-tight sm:text-5xl">
          Understand trending developer tools before you adopt them
        </h1>
        <p className="mx-auto max-w-2xl text-lg leading-8 text-gray-600 dark:text-gray-300">
          Clear guides explaining what each project does, who it is for, how
          to start, and what the official activity signals really mean.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3 text-sm">
          <span className="rounded-full bg-white px-4 py-2 shadow-sm dark:bg-gray-900">
            {articles.length} quality-checked guides
          </span>
          <span className="rounded-full bg-white px-4 py-2 shadow-sm dark:bg-gray-900">
            GitHub · npm · Hacker News
          </span>
          <Link
            href="/editorial-policy"
            className="rounded-full bg-gray-900 px-4 py-2 font-medium text-white hover:bg-blue-700 dark:bg-white dark:text-gray-950"
          >
            How we verify claims
          </Link>
        </div>
      </section>

      {/* Ad above fold */}
      <AdUnit placement="home-top" />

      {/* Trending Section */}
      <section className="mb-12">
        <div className="mb-6">
          <h2 className="text-2xl font-bold">Most active right now</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Projects with notable source activity—not a ranking of product quality.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trending.map((article) => (
            <ArticleCard key={article.slug} article={article} />
          ))}
        </div>
      </section>

      {/* Ad mid-page */}
      <AdUnit placement="home-mid" />

      {/* Latest Articles */}
      <section className="mb-12">
        <div className="mb-6">
          <h2 className="text-2xl font-bold">Recently updated practical guides</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Start with what the tool is for, then inspect setup, tradeoffs, and sources.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recent.map((article) => (
            <ArticleCard key={article.slug} article={article} />
          ))}
        </div>
      </section>

      {/* Categories overview */}
      <section>
        <h2 className="text-2xl font-bold mb-6">Browse by what you build</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {Object.entries(CATEGORY_LABELS).map(([slug, label]) => (
            <Link
              key={slug}
              href={`/category/${slug}`}
              className="p-4 rounded-lg border border-gray-200 dark:border-gray-800 hover:border-blue-500 hover:shadow-md transition-all text-center"
            >
              <span className="font-medium">{label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Ad bottom */}
      <AdUnit placement="home-bottom" />
    </div>
  );
}
