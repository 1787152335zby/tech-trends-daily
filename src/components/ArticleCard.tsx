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

  return (
    <Link href={`/article/${slug}`} className="block group">
      <article className="h-full p-5 rounded-lg border border-gray-200 dark:border-gray-800 hover:border-blue-400 hover:shadow-lg transition-all">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <SourceBadge source={sourceData.source} />
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {CATEGORY_LABELS[category]}
          </span>
          <span className="text-xs text-gray-400">
            {sourceData.source === "hackernews" ? "▲" : "⭐"}{" "}
            {formatNumber(sourceData.stars)}
          </span>
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
          {sourceData.source === "npm" && (
            <span>⬇ {formatNumber(sourceData.starsGrowth)}/wk</span>
          )}
          {sourceData.source === "github" && (
            <span>📈 +{formatNumber(sourceData.starsGrowth)}/wk</span>
          )}
          {sourceData.source === "github" && (
            <span className="ml-auto">{sourceData.license}</span>
          )}
        </div>
      </article>
    </Link>
  );
}
