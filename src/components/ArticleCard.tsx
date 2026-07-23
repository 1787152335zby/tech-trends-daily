import type { ArticlePreview } from "@/lib/types";
import { CATEGORY_LABELS } from "@/lib/types";
import Link from "next/link";
import SourceBadge from "@/components/SourceBadge";
import { articlePath } from "@/lib/article-presentation";

interface ArticleCardProps {
  article: ArticlePreview;
}

export default function ArticleCard({ article }: ArticleCardProps) {
  const { slug, title, description, category, source, language, signalLabel } =
    article;

  return (
    <Link href={articlePath(slug)} className="block group">
      <article className="flex h-full flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-400 hover:shadow-lg dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <SourceBadge source={source} />
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {CATEGORY_LABELS[category]}
          </span>
        </div>

        <h3 className="line-clamp-2 mb-2 text-base font-semibold leading-snug transition-colors group-hover:text-blue-600">
          {title}
        </h3>

        <p className="line-clamp-3 mb-4 text-sm leading-6 text-gray-600 dark:text-gray-400">
          {description}
        </p>

        <div className="mt-auto flex flex-wrap items-center gap-3 border-t border-gray-100 pt-3 text-xs text-gray-500 dark:border-gray-800 dark:text-gray-400">
          {signalLabel ? (
            <span>{signalLabel}</span>
          ) : (
            <span>Metric unavailable</span>
          )}
          {language !== "Unknown" && <span>{language}</span>}
          <span className="ml-auto font-medium text-blue-600 group-hover:text-blue-700">
            Read guide →
          </span>
        </div>
      </article>
    </Link>
  );
}
