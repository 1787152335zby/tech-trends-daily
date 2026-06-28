import { loadAllArticles, loadArticle } from "@/lib/articles";
import { CATEGORY_LABELS } from "@/lib/types";
import { SITE_URL, SITE_NAME } from "@/lib/constants";
import AdUnit from "@/components/AdUnit";
import Link from "next/link";
import { notFound } from "next/navigation";

interface Props { params: Promise<{ slug: string }>; }

export async function generateStaticParams() {
  const articles = loadAllArticles();
  return articles.map((a) => ({ slug: a.slug }));
}
export const dynamicParams = false;
export const dynamic = "force-static";

function fmt(n: number): string { return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n); }

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = loadArticle(slug);
  if (!article) notFound();

  const allArticles = loadAllArticles();
  const related = allArticles
    .filter(a => a.category === article.category && a.slug !== article.slug)
    .slice(0, 4);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.description,
    datePublished: article.publishedAt,
    dateModified: article.updatedAt,
    author: { "@type": "Organization", name: SITE_NAME },
    publisher: { "@type": "Organization", name: SITE_NAME },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${SITE_URL}/article/${slug}`,
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <nav className="text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-blue-600">Home</Link>
          {" / "}
          <Link href={`/category/${article.category}`} className="hover:text-blue-600">
            {CATEGORY_LABELS[article.category]}
          </Link>
          {" / "}
          <span className="text-gray-400">{article.type}</span>
        </nav>

        <header className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            {article.title}
          </h1>
          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
            <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-xs font-medium">
              {article.type}
            </span>
            <span>{CATEGORY_LABELS[article.category]}</span>
            <span>⭐ {fmt(article.sourceData.stars)}</span>
            <span>📈 +{fmt(article.sourceData.starsGrowth)}/wk</span>
            <span>Published: {new Date(article.publishedAt).toLocaleDateString("en-US")}</span>
          </div>
        </header>

        <div
          className="prose prose-lg dark:prose-invert max-w-none mb-8 article-body"
          dangerouslySetInnerHTML={{ __html: article.bodyHtml }}
        />

        <div className="my-8 p-4 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <strong>Source:</strong>{" "}
            <a href={article.sourceData.url} target="_blank" rel="noopener noreferrer nofollow" className="text-blue-600 hover:underline">
              {article.sourceData.fullName}
            </a>
            {" — "}{article.sourceData.license} license
          </p>
        </div>

        {article.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            {article.tags.map((tag: string) => (
              <span key={tag} className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-xs text-gray-600 dark:text-gray-400">
                #{tag}
              </span>
            ))}
          </div>
        )}

        <AdUnit slot="article-bottom" />

        {related.length > 0 && (
          <section className="mt-12">
            <h2 className="text-2xl font-bold mb-4">📚 Related Articles</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {related.map((r) => (
                <Link key={r.slug} href={`/article/${r.slug}`} className="p-4 rounded-lg border border-gray-200 dark:border-gray-800 hover:border-blue-400 hover:shadow-md transition-all">
                  <h3 className="font-semibold text-sm leading-snug">{r.title}</h3>
                  <p className="text-xs text-gray-500 mt-1">{r.description.slice(0, 100)}...</p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>
    </>
  );
}
