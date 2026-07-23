import { loadAllArticles, loadArticle } from "@/lib/articles";
import { CATEGORY_LABELS } from "@/lib/types";
import {
  deduplicateArticlesBySource,
  loadArticleRedirect,
  loadArticleRedirects,
} from "@/lib/articles";
import { SITE_URL, SITE_NAME } from "@/lib/constants";
import AdUnit from "@/components/AdUnit";
import SourceBadge, { getSourceLabel } from "@/components/SourceBadge";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";

interface Props { params: Promise<{ slug: string }>; }

export async function generateStaticParams() {
  const articles = loadAllArticles();
  const historicalSlugs = Object.keys(loadArticleRedirects());
  return [
    ...articles.map((article) => ({ slug: article.slug })),
    ...historicalSlugs.map((slug) => ({ slug })),
  ];
}
export const dynamicParams = false;
export const dynamic = "force-static";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const redirectSlug = loadArticleRedirect(slug);
  if (redirectSlug) permanentRedirect(`/article/${redirectSlug}/`);

  const article = loadArticle(slug);

  if (!article) notFound();

  const canonicalPath = `/article/${article.slug}`;
  const indexable = article.indexable !== false;

  return {
    title: article.title,
    description: article.description,
    authors: [
      {
        name: `${SITE_NAME} Editorial Team`,
        url: "/editorial-policy",
      },
    ],
    publisher: SITE_NAME,
    robots: {
      index: indexable,
      follow: true,
      googleBot: {
        index: indexable,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      type: "article",
      title: article.title,
      description: article.description,
      url: canonicalPath,
      siteName: SITE_NAME,
      publishedTime: article.publishedAt,
      modifiedTime: article.updatedAt || article.publishedAt,
      tags: article.tags,
    },
    twitter: {
      card: "summary",
      title: article.title,
      description: article.description,
    },
  };
}

function fmt(n: number): string { if (n >= 1000000000) return `${(n / 1000000000).toFixed(1)}B`; if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`; if (n >= 1000) return `${(n / 1000).toFixed(1)}k`; return String(n); }

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const redirectSlug = loadArticleRedirect(slug);
  if (redirectSlug) permanentRedirect(`/article/${redirectSlug}/`);

  const article = loadArticle(slug);
  if (!article) notFound();

  const articleHtml = article.bodyHtml
    .replace(/<div class=["']ad-container["']>[\s\S]*?<\/div>/gi, "")
    .replace(/<p class=["']disclosure["']>[\s\S]*?<\/p>/gi, "");

  const allArticles = loadAllArticles();
  const related = deduplicateArticlesBySource(
    allArticles.filter(
      (candidate) =>
        candidate.indexable !== false &&
        candidate.category === article.category &&
        candidate.slug !== article.slug,
    ),
    new Set([article.sourceData.id || article.sourceData.url]),
  ).slice(0, 4);

  const canonicalUrl = `${SITE_URL}/article/${article.slug}`;
  const editorialPolicyUrl = `${SITE_URL}/editorial-policy`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.description,
    datePublished: article.publishedAt,
    dateModified: article.updatedAt || article.publishedAt,
    author: {
      "@type": "Organization",
      name: `${SITE_NAME} Editorial Team`,
      url: editorialPolicyUrl,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
    articleSection: CATEGORY_LABELS[article.category],
    keywords: article.tags.join(", "),
    isAccessibleForFree: true,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": canonicalUrl,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <nav className="text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-blue-600">Home</Link>
          {" / "}
          <Link href={`/category/${article.category}`} className="hover:text-blue-600">
            {CATEGORY_LABELS[article.category]}
          </Link>
          {" / "}
          <span className="text-gray-400">
            {getSourceLabel(article.sourceData.source)}
          </span>
        </nav>

        <header className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            {article.title}
          </h1>
          <p className="mb-5 max-w-3xl text-lg leading-8 text-gray-600 dark:text-gray-300">
            {article.description}
          </p>
          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
            <SourceBadge source={article.sourceData.source} />
            <span>{CATEGORY_LABELS[article.category]}</span>
            {article.sourceData.source === "npm" && (
              <span>{fmt(article.sourceData.starsGrowth)} weekly downloads</span>
            )}
            {article.sourceData.source === "github" && (
              <span>+{fmt(article.sourceData.starsGrowth)} weekly stars</span>
            )}
            {article.sourceData.source === "hackernews" && (
              <span>{fmt(article.sourceData.starsGrowth)} discussion points</span>
            )}
            <span>
              Published:{" "}
              <time dateTime={article.publishedAt}>
                {new Date(article.publishedAt).toLocaleDateString("en-US")}
              </time>
            </span>
            {article.updatedAt !== article.publishedAt && (
              <span>
                Updated:{" "}
                <time dateTime={article.updatedAt}>
                  {new Date(article.updatedAt).toLocaleDateString("en-US")}
                </time>
              </span>
            )}
          </div>
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            By{" "}
            <Link
              href="/editorial-policy"
              rel="author"
              className="font-medium text-gray-900 underline decoration-gray-300 underline-offset-4 hover:text-blue-600 dark:text-gray-100"
            >
              {SITE_NAME} Editorial Team
            </Link>
          </p>
        </header>

        <div
          className="prose prose-lg dark:prose-invert max-w-none mb-8 article-body"
          dangerouslySetInnerHTML={{ __html: articleHtml }}
        />

        <aside className="mb-8 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
          This guide was drafted through an automated workflow using public
          source data and must pass evidence and editorial validation before
          appearing in our searchable catalog. It remains eligible for human
          spot checks, but the project was not personally tested. See
          our{" "}
          <Link href="/editorial-policy" className="font-medium underline">
            Editorial Policy
          </Link>{" "}
          and verify important technical, licensing, and security details with
          the original source below. Advertising is separate from editorial
          selection.
        </aside>

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

        <AdUnit placement="article-bottom" />

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
