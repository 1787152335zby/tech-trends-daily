import { Article, CATEGORY_LABELS } from "@/lib/types";
import Link from "next/link";

interface ArticleCardProps {
  article: Article;
}

function formatNumber(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export default function ArticleCard({ article }: ArticleCardProps) {
  const { slug, title, description, category, type, sourceData } = article;

  const typeColors: Record<string, string> = {
    review: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    vs: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    howto: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    bestof: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
    trend: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  };

  return (
    <Link href={`/article/${slug}`} className="block group">
      <article className="h-full p-5 rounded-lg border border-gray-200 dark:border-gray-800 hover:border-blue-400 hover:shadow-lg transition-all">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeColors[type] || "bg-gray-100"}`}>
            {type}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {CATEGORY_LABELS[category]}
          </span>
          <span className="text-xs text-gray-400">⭐ {formatNumber(sourceData.stars)}</span>
        </div>

        <h3 className="text-base font-semibold leading-snug mb-2 group-hover:text-blue-600 transition-colors line-clamp-2">
          {title}
        </h3>

        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
          {description}
        </p>

        <div className="flex items-center gap-3 text-xs text-gray-400">
          {sourceData.language !== "Unknown" && (
            <span>{sourceData.language}</span>
          )}
          <span>📈 +{formatNumber(sourceData.starsGrowth)}/wk</span>
          {sourceData.source === "github" && (
            <span className="ml-auto">{sourceData.license}</span>
          )}
        </div>
      </article>
    </Link>
  );
}
