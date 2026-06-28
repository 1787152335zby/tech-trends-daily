import { Article, CATEGORY_LABELS, CATEGORY_SLUGS, ArticleCategory } from "./types";
import fs from "fs";
import path from "path";
import { CONTENT_DIR } from "./constants";

/**
 * Load all articles from the generated content directory.
 */
export function loadAllArticles(): Article[] {
  try {
    const indexPath = path.join(process.cwd(), CONTENT_DIR, "index.json");
    if (!fs.existsSync(indexPath)) return [];
    return JSON.parse(fs.readFileSync(indexPath, "utf-8"));
  } catch {
    return [];
  }
}

/**
 * Load a single article by slug.
 */
export function loadArticle(slug: string): Article | null {
  try {
    const fp = path.join(process.cwd(), CONTENT_DIR, `${slug}.json`);
    if (!fs.existsSync(fp)) return null;
    return JSON.parse(fs.readFileSync(fp, "utf-8"));
  } catch {
    return null;
  }
}

/**
 * Get articles grouped by category for navigation.
 */
export function getArticlesByCategory(): Record<ArticleCategory, Article[]> {
  const articles = loadAllArticles();
  const grouped: Record<string, Article[]> = {};

  for (const article of articles) {
    if (!grouped[article.category]) {
      grouped[article.category] = [];
    }
    grouped[article.category].push(article);
  }

  return grouped as Record<ArticleCategory, Article[]>;
}

/**
 * Get trending articles (top by starsGrowth).
 */
export function getTrendingArticles(limit = 10): Article[] {
  const articles = loadAllArticles();
  return articles
    .sort((a, b) => b.sourceData.starsGrowth - a.sourceData.starsGrowth)
    .slice(0, limit);
}

/**
 * Get category display info.
 */
export function getCategoryInfo(category: ArticleCategory) {
  return {
    slug: CATEGORY_SLUGS[category],
    label: CATEGORY_LABELS[category],
  };
}
