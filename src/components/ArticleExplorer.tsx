"use client";

import { useMemo, useState } from "react";
import ArticleCard from "@/components/ArticleCard";
import type { ArticleCategory, ArticlePreview, RepoData } from "@/lib/types";
import { CATEGORY_LABELS } from "@/lib/types";

interface ArticleExplorerProps {
  articles: ArticlePreview[];
}

type SourceFilter = "all" | RepoData["source"];
type CategoryFilter = "all" | ArticleCategory;

const SOURCE_OPTIONS: Array<{ value: SourceFilter; label: string }> = [
  { value: "all", label: "All sources" },
  { value: "github", label: "GitHub" },
  { value: "npm", label: "npm" },
  { value: "hackernews", label: "Hacker News" },
];

export default function ArticleExplorer({ articles }: ArticleExplorerProps) {
  const [query, setQuery] = useState("");
  const [source, setSource] = useState<SourceFilter>("all");
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [visibleCount, setVisibleCount] = useState(12);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("en-US");
    return articles.filter((article) => {
      if (source !== "all" && article.source !== source) return false;
      if (category !== "all" && article.category !== category) return false;
      if (!normalizedQuery) return true;
      return `${article.title} ${article.description} ${article.language}`
        .toLocaleLowerCase("en-US")
        .includes(normalizedQuery);
    });
  }, [articles, category, query, source]);

  const updateQuery = (value: string) => {
    setQuery(value);
    setVisibleCount(12);
  };

  return (
    <section id="explore" className="mb-12 scroll-mt-6">
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700 dark:text-blue-300">
          Find the right guide
        </p>
        <h2 className="mt-2 text-2xl font-bold">Explore tools and discussions</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Search by project, use case, ecosystem, source, or category.
        </p>
      </div>

      <div className="mb-6 grid gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900 sm:grid-cols-[minmax(0,1fr)_auto]">
        <label className="sm:col-span-2">
          <span className="sr-only">Search guides</span>
          <input
            type="search"
            value={query}
            onChange={(event) => updateQuery(event.target.value)}
            placeholder="Search React, databases, AI tools…"
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-950 dark:focus:ring-blue-950"
          />
        </label>

        <div className="flex flex-wrap gap-2">
          {SOURCE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={source === option.value}
              onClick={() => {
                setSource(option.value);
                setVisibleCount(12);
              }}
              className={`rounded-full px-3 py-2 text-sm font-medium transition ${
                source === option.value
                  ? "bg-blue-600 text-white"
                  : "border border-gray-300 bg-white hover:border-blue-400 dark:border-gray-700 dark:bg-gray-950"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <label className="sm:justify-self-end">
          <span className="sr-only">Filter by category</span>
          <select
            value={category}
            onChange={(event) => {
              setCategory(event.target.value as CategoryFilter);
              setVisibleCount(12);
            }}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950 sm:w-auto"
          >
            <option value="all">All categories</option>
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="mb-4 text-sm text-gray-500" aria-live="polite">
        {filtered.length} {filtered.length === 1 ? "guide" : "guides"} found
      </p>

      {filtered.length > 0 ? (
        <>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filtered.slice(0, visibleCount).map((article) => (
              <ArticleCard key={article.slug} article={article} />
            ))}
          </div>
          {visibleCount < filtered.length && (
            <div className="mt-8 text-center">
              <button
                type="button"
                onClick={() => setVisibleCount((count) => count + 12)}
                className="rounded-full border border-gray-300 px-5 py-2.5 text-sm font-semibold hover:border-blue-500 hover:text-blue-700 dark:border-gray-700"
              >
                Show more guides
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="rounded-xl border border-dashed border-gray-300 px-6 py-12 text-center text-gray-500 dark:border-gray-700">
          No matching guide yet. Try a broader project name or category.
        </div>
      )}
    </section>
  );
}
