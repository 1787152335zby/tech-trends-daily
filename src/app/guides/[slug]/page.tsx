import {
  deduplicateArticlesBySource,
  loadAllArticles,
  loadArticle,
} from "@/lib/articles";
import {
  articlePath,
  evidenceCompletenessLabel,
  getPrimarySignal,
} from "@/lib/article-presentation";
import { CATEGORY_LABELS } from "@/lib/types";
import { SITE_URL, SITE_NAME } from "@/lib/constants";
import AdUnit from "@/components/AdUnit";
import SourceBadge, { getSourceLabel } from "@/components/SourceBadge";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return loadAllArticles().map((article) => ({ slug: article.slug }));
}

export const dynamicParams = false;
export const dynamic = "force-static";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = loadArticle(slug);
  if (!article) notFound();

  const canonicalPath = articlePath(article.slug);
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

export default async function GuidePage({ params }: Props) {
  const { slug } = await params;
  const article = loadArticle(slug);
  if (!article) notFound();

  const articleHtml = article.bodyHtml
    .replace(/<div class=["']ad-container["']>[\s\S]*?<\/div>/gi, "")
    .replace(/<p class=["']disclosure["']>[\s\S]*?<\/p>/gi, "");
  const allArticles = loadAllArticles();
  const relatedBySlug = new Map(
    allArticles
      .filter((candidate) => candidate.indexable !== false)
      .map((candidate) => [candidate.slug, candidate]),
  );
  const storedRelated = article.relatedSlugs
    .map((relatedSlug) => relatedBySlug.get(relatedSlug))
    .filter((candidate): candidate is NonNullable<typeof candidate> =>
      Boolean(candidate),
    );
  const related =
    storedRelated.length > 0
      ? storedRelated.slice(0, 4)
      : deduplicateArticlesBySource(
          allArticles.filter(
            (candidate) =>
              candidate.indexable !== false &&
              candidate.category === article.category &&
              candidate.slug !== article.slug,
          ),
          new Set([article.sourceData.id || article.sourceData.url]),
        ).slice(0, 4);
  const primarySignal = getPrimarySignal(article);
  const completeness = evidenceCompletenessLabel(article.evidence?.score);
  const canonicalUrl = `${SITE_URL}${articlePath(article.slug)}`;
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
      <article className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <nav className="mb-6 text-sm text-gray-500">
          <Link href="/" className="hover:text-blue-600">
            Home
          </Link>
          {" / "}
          <Link
            href={`/category/${article.category}`}
            className="hover:text-blue-600"
          >
            {CATEGORY_LABELS[article.category]}
          </Link>
          {" / "}
          <span className="text-gray-400">
            {getSourceLabel(article.sourceData.source)}
          </span>
        </nav>

        <header className="mb-8">
          <h1 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
            {article.title}
          </h1>
          <p className="mb-5 max-w-3xl text-lg leading-8 text-gray-600 dark:text-gray-300">
            {article.description}
          </p>
          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
            <SourceBadge source={article.sourceData.source} />
            <span>{CATEGORY_LABELS[article.category]}</span>
            {primarySignal && <span>{primarySignal.label}</span>}
            <span>Source completeness: {completeness}</span>
            <span>
              Updated:{" "}
              <time dateTime={article.updatedAt}>
                {new Date(article.updatedAt).toLocaleDateString("en-US")}
              </time>
            </span>
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
          className="article-body prose prose-lg mb-8 max-w-none dark:prose-invert"
          dangerouslySetInnerHTML={{ __html: articleHtml }}
        />

        <details className="mb-8 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
          <summary className="cursor-pointer font-semibold">
            How this guide was produced
          </summary>
          <p className="mt-3 leading-6">
            This guide was drafted by an automated workflow from public source
            data and passed evidence and editorial validation. It does not
            claim personal testing. Verify important technical, licensing, and
            security details with the original source and read our{" "}
            <Link href="/editorial-policy" className="font-medium underline">
              Editorial Policy
            </Link>
            .
          </p>
        </details>

        <div className="my-8 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <strong>Primary source:</strong>{" "}
            <a
              href={article.sourceData.url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="text-blue-600 hover:underline"
            >
              {article.sourceData.fullName}
            </a>
            {article.sourceData.license &&
              article.sourceData.license !== "N/A" &&
              ` — ${article.sourceData.license} license`}
          </p>
        </div>

        {article.tags.length > 0 && (
          <div className="mb-8 flex flex-wrap gap-2">
            {article.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        <AdUnit placement="article-bottom" />

        {related.length > 0 && (
          <section className="mt-12">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700 dark:text-blue-300">
              Compare before you choose
            </p>
            <h2 className="mt-2 mb-4 text-2xl font-bold">Related guides</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {related.map((candidate) => (
                <Link
                  key={candidate.slug}
                  href={articlePath(candidate.slug)}
                  className="rounded-lg border border-gray-200 p-4 transition-all hover:border-blue-400 hover:shadow-md dark:border-gray-800"
                >
                  <h3 className="text-sm font-semibold leading-snug">
                    {candidate.title}
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-gray-500">
                    {candidate.description.slice(0, 135)}
                    {candidate.description.length > 135 ? "…" : ""}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>
    </>
  );
}
