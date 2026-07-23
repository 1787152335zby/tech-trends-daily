import { Article, CATEGORY_LABELS } from "@/lib/types";
import Link from "next/link";
import SourceBadge from "@/components/SourceBadge";

interface ArticleCardProps {
  article: Article;
}

function formatNumber(n: number): string {
  if (n >= 1000000000) return `${(n / 1000000000).toFixed(1)}B`;
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export default function ArticleCard({ article }: ArticleCardProps) {
  const { slug, title, description, category, sourceData } = article;
  const primarySignal =
    sourceData.source === "npm"
      ? `${formatNumber(sourceData.starsGrowth)} weekly downloads`
      : sourceData.source === "hackernews"
        ? `${formatNumber(sourceData.starsGrowth)} discussion points`
        : `+${formatNumber(sourceData.starsGrowth)} weekly stars`;

  return (
    <Link href={`/article/${slug}`} className="block group">
      <article className="flex h-full flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-400 hover:shadow-lg dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <SourceBadge source={sourceData.source} />
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {CATEGORY_LABELS[category]}
          </span>
        </div>

        <h3 className="text-base font-semibold leading-snug mb-2 group-hover:text-blue-600 transition-colors line-clamp-2">
          {title}
        </h3>

        <p className="mb-4 text-sm leading-6 text-gray-600 line-clamp-3 dark:text-gray-400">
          {description}
        </p>

        <div className="mt-auto flex flex-wrap items-center gap-3 border-t border-gray-100 pt-3 text-xs text-gray-500 dark:border-gray-800 dark:text-gray-400">
          <span>{primarySignal}</span>
          {sourceData.language !== "Unknown" && (
            <span>{sourceData.language}</span>
          )}
          <span className="ml-auto font-medium text-blue-600 group-hover:text-blue-700">
            Read guide →
          </span>
        </div>
      </article>
    </Link>
  );
}
