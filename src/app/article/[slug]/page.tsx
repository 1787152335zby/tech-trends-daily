import {
  loadAllArticles,
  loadArticle,
  loadArticleRedirect,
  loadArticleRedirects,
} from "@/lib/articles";
import { articlePath } from "@/lib/article-presentation";
import { notFound, permanentRedirect } from "next/navigation";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return [
    ...loadAllArticles().map((article) => ({ slug: article.slug })),
    ...Object.keys(loadArticleRedirects()).map((slug) => ({ slug })),
  ];
}

export const dynamicParams = false;
export const dynamic = "force-static";

export default async function LegacyArticlePage({ params }: Props) {
  const { slug } = await params;
  const target = loadArticleRedirect(slug) ?? (loadArticle(slug) ? slug : null);
  if (!target) notFound();
  permanentRedirect(`${articlePath(target)}/`);
}
