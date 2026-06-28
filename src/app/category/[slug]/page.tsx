import { loadAllArticles } from "@/lib/articles";
import { CATEGORY_LABELS, ArticleCategory } from "@/lib/types";
import ArticleCard from "@/components/ArticleCard";
import Link from "next/link";
import { notFound } from "next/navigation";

interface Props { params: { slug: string }; }

const VALID_SLUGS = Object.keys(CATEGORY_LABELS) as ArticleCategory[];

export async function generateStaticParams() {
  return VALID_SLUGS.map((slug) => ({ slug }));
}
export const dynamicParams = false;
export const dynamic = "force-static";

export default function CategoryPage({ params }: Props) {
  const { slug } = params;
  const label = CATEGORY_LABELS[slug as ArticleCategory];
  if (!label) notFound();

  const articles = loadAllArticles().filter(a => a.category === slug);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <nav className="text-sm text-gray-500 mb-6">
        <Link href="/" className="hover:text-blue-600">Home</Link>
        {" / "}
        <span className="text-gray-400">{label}</span>
      </nav>
      <h1 className="text-3xl font-bold mb-4">{label}</h1>
      <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
        Trending {label.toLowerCase()} open-source projects, updated daily.
      </p>
      {articles.length === 0 ? (
        <p className="text-gray-500">No articles yet. Check back soon!</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {articles.map(a => <ArticleCard key={a.slug} article={a} />)}
        </div>
      )}
    </div>
  );
}
