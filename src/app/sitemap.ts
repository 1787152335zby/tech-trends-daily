import type { MetadataRoute } from "next";
import { loadAllArticles } from "@/lib/articles";
import { SITE_URL } from "@/lib/constants";
import { CATEGORY_SLUGS } from "@/lib/types";
import { articlePath } from "@/lib/article-presentation";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = SITE_URL.replace(/\/$/, "");
  const articles = loadAllArticles().filter((article) => article.indexable !== false);
  const latestUpdate = articles
    .map((article) => article.updatedAt || article.publishedAt)
    .sort()
    .at(-1);

  const staticPages: MetadataRoute.Sitemap = [
    "",
    "/about",
    "/contact",
    "/editorial-policy",
    "/privacy",
  ].map((pathname) => ({
    url: `${siteUrl}${pathname}`,
    lastModified: latestUpdate,
    changeFrequency: pathname === "" ? "daily" : "monthly",
    priority: pathname === "" ? 1 : 0.5,
  }));

  const categoryPages: MetadataRoute.Sitemap = Object.values(CATEGORY_SLUGS).map(
    (slug) => ({
      url: `${siteUrl}/category/${slug}`,
      lastModified: latestUpdate,
      changeFrequency: "daily",
      priority: 0.7,
    }),
  );

  const articlePages: MetadataRoute.Sitemap = articles.map((article) => ({
    url: `${siteUrl}${articlePath(article.slug)}`,
    lastModified: article.updatedAt || article.publishedAt,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticPages, ...categoryPages, ...articlePages];
}
