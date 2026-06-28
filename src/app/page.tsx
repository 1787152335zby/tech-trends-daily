import { loadAllArticles, getTrendingArticles } from "@/lib/articles";
import { SITE_NAME } from "@/lib/constants";
import { CATEGORY_LABELS } from "@/lib/types";
import ArticleCard from "@/components/ArticleCard";
import AdUnit from "@/components/AdUnit";
import Link from "next/link";

export default function HomePage() {
  const articles = loadAllArticles();
  const trending = getTrendingArticles(12);
  const recent = articles.slice(0, 30);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero */}
      <section className="mb-12 text-center">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
          {SITE_NAME}
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Daily curated open-source tools, libraries, and frameworks. Stay ahead with trending GitHub repos, NPM packages, and Hacker News picks.
        </p>
      </section>

      {/* Ad above fold */}
      <AdUnit slot="home-top" />

      {/* Trending Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">🔥 Trending This Week</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trending.map((article) => (
            <ArticleCard key={article.slug} article={article} />
          ))}
        </div>
      </section>

      {/* Ad mid-page */}
      <AdUnit slot="home-mid" />

      {/* Latest Articles */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">📰 Latest Coverage</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recent.map((article) => (
            <ArticleCard key={article.slug} article={article} />
          ))}
        </div>
      </section>

      {/* Categories overview */}
      <section>
        <h2 className="text-2xl font-bold mb-6">📂 Browse by Category</h2>
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
      <AdUnit slot="home-bottom" />
    </div>
  );
}
