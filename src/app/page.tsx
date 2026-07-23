import type { Metadata } from "next";
import Link from "next/link";
import { getTrendingArticles, loadIndexableArticles } from "@/lib/articles";
import { SITE_DESCRIPTION, SITE_URL } from "@/lib/constants";
import { CATEGORY_LABELS } from "@/lib/types";
import { toArticlePreview } from "@/lib/article-presentation";
import ArticleCard from "@/components/ArticleCard";
import ArticleExplorer from "@/components/ArticleExplorer";
import AdUnit from "@/components/AdUnit";

export const metadata: Metadata = {
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: SITE_URL,
  },
};

export default function HomePage() {
  const articles = loadIndexableArticles();
  const trending = getTrendingArticles(9);
  const searchable = [...articles]
    .sort(
      (left, right) =>
        right.updatedAt.localeCompare(left.updatedAt) ||
        left.title.localeCompare(right.title),
    )
    .map(toArticlePreview);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="mb-12 overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-indigo-50 px-6 py-12 text-center dark:border-blue-950 dark:from-blue-950/40 dark:via-gray-950 dark:to-indigo-950/30 sm:px-10">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-blue-700 dark:text-blue-300">
          Practical open-source research
        </p>
        <h1 className="mx-auto mb-4 max-w-3xl text-3xl font-bold tracking-tight sm:text-5xl">
          Understand developer tools before you adopt them
        </h1>
        <p className="mx-auto max-w-2xl text-lg leading-8 text-gray-600 dark:text-gray-300">
          Decision-focused guides explain what each project does, where it
          fits, how to start, what to verify, and which source signals are
          actually available.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3 text-sm">
          <span className="rounded-full bg-white px-4 py-2 shadow-sm dark:bg-gray-900">
            {articles.length} quality-checked guides
          </span>
          <span className="rounded-full bg-white px-4 py-2 shadow-sm dark:bg-gray-900">
            GitHub · npm · Hacker News
          </span>
          <a
            href="#explore"
            className="rounded-full bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
          >
            Search the guides
          </a>
          <Link
            href="/editorial-policy"
            className="rounded-full bg-gray-900 px-4 py-2 font-medium text-white hover:bg-gray-700 dark:bg-white dark:text-gray-950"
          >
            How we verify claims
          </Link>
        </div>
      </section>

      <AdUnit placement="home-top" />

      <section className="mb-12">
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700 dark:text-blue-300">
            Source-balanced trend view
          </p>
          <h2 className="mt-2 text-2xl font-bold">Fresh signals across the ecosystem</h2>
          <p className="mt-1 max-w-3xl text-sm text-gray-500 dark:text-gray-400">
            A mix of recently released npm packages, active repositories, and
            timely discussions. Recency and source-specific activity both
            matter; this is not a product-quality ranking.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {trending.map((article) => (
            <ArticleCard
              key={article.slug}
              article={toArticlePreview(article)}
            />
          ))}
        </div>
      </section>

      <AdUnit placement="home-mid" />

      <ArticleExplorer articles={searchable} />

      <section>
        <h2 className="mb-6 text-2xl font-bold">Browse by what you build</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
          {Object.entries(CATEGORY_LABELS).map(([slug, label]) => (
            <Link
              key={slug}
              href={`/category/${slug}`}
              className="rounded-lg border border-gray-200 p-4 text-center transition-all hover:border-blue-500 hover:shadow-md dark:border-gray-800"
            >
              <span className="font-medium">{label}</span>
            </Link>
          ))}
        </div>
      </section>

      <AdUnit placement="home-bottom" />
    </div>
  );
}
