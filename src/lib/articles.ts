import { Article, CATEGORY_LABELS, CATEGORY_SLUGS, ArticleCategory } from "./types";
import type { RepoData } from "./types";
import fs from "fs";
import path from "path";
import { CONTENT_DIR } from "./constants";
import { getTrendScore } from "./article-presentation";

const REDIRECTS_FILE = path.join("content", "article-redirects.json");

function normalizeRedirectSlug(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  const articlePrefix = "/article/";
  const slug = trimmed.startsWith(articlePrefix)
    ? trimmed.slice(articlePrefix.length)
    : trimmed;

  if (!slug || slug.includes("/") || slug === "." || slug === "..") return null;
  return slug;
}

function parseArticleRedirects(value: unknown): Record<string, string> {
  const redirects: Record<string, string> = {};

  const addRedirect = (fromValue: unknown, toValue: unknown) => {
    const from = normalizeRedirectSlug(fromValue);
    const to =
      normalizeRedirectSlug(toValue) ??
      (toValue && typeof toValue === "object"
        ? normalizeRedirectSlug(
            (toValue as { destination?: unknown; slug?: unknown }).destination ??
              (toValue as { slug?: unknown }).slug,
          )
        : null);

    if (from && to && from !== to) redirects[from] = to;
  };

  if (Array.isArray(value)) {
    for (const entry of value) {
      if (!entry || typeof entry !== "object") continue;
      const item = entry as {
        from?: unknown;
        source?: unknown;
        to?: unknown;
        destination?: unknown;
      };
      addRedirect(item.from ?? item.source, item.to ?? item.destination);
    }
  } else if (value && typeof value === "object") {
    for (const [from, to] of Object.entries(value)) addRedirect(from, to);
  }

  return redirects;
}

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
 * Public discovery surfaces only show pages that passed the current content
 * policy. Older canonical pages remain available with noindex metadata while
 * they wait for a stronger evidence refresh.
 */
export function loadIndexableArticles(): Article[] {
  return loadAllArticles().filter((article) => article.indexable !== false);
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
 * Load historical article slug redirects.
 *
 * The generated file may be absent during local development. Both a simple
 * old-to-new object map and an array of redirect entries are accepted.
 */
export function loadArticleRedirects(): Record<string, string> {
  try {
    const redirectsPath = path.join(process.cwd(), REDIRECTS_FILE);
    if (!fs.existsSync(redirectsPath)) return {};
    return parseArticleRedirects(
      JSON.parse(fs.readFileSync(redirectsPath, "utf-8")),
    );
  } catch {
    return {};
  }
}

export function loadArticleRedirect(slug: string): string | null {
  return loadArticleRedirects()[slug] ?? null;
}

/**
 * Keep the first article for each source project/package/story.
 */
export function deduplicateArticlesBySource(
  articles: Article[],
  excludedSourceIds: ReadonlySet<string> = new Set(),
): Article[] {
  const seen = new Set(excludedSourceIds);

  return articles.filter((article) => {
    const sourceId = article.sourceData.id || article.sourceData.url;
    if (seen.has(sourceId)) return false;
    seen.add(sourceId);
    return true;
  });
}

/**
 * Get articles grouped by category for navigation.
 */
export function getArticlesByCategory(): Record<ArticleCategory, Article[]> {
  const articles = loadIndexableArticles();
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
 * Get a source-balanced trend set. Scores combine a source-appropriate
 * attention signal with release, publication, repository, or push recency.
 */
export function getTrendingArticles(limit = 10): Article[] {
  const articles = deduplicateArticlesBySource(loadIndexableArticles());
  const referenceTime = articles.reduce((latest, article) => {
    const candidate = Date.parse(
      article.evidence?.fetchedAt ?? article.updatedAt ?? article.publishedAt,
    );
    return Number.isFinite(candidate) ? Math.max(latest, candidate) : latest;
  }, 0);
  const effectiveReference = referenceTime || Date.now();
  const sources: RepoData["source"][] = ["github", "npm", "hackernews"];
  const queues = new Map(
    sources.map((source) => [
      source,
      articles
        .filter((article) => article.sourceData.source === source)
        .map((article) => ({
          article,
          score: getTrendScore(article, effectiveReference),
        }))
        .filter((candidate) => candidate.score > 0)
        .sort(
          (left, right) =>
            right.score - left.score ||
            right.article.updatedAt.localeCompare(left.article.updatedAt),
        ),
    ]),
  );

  const selected: Article[] = [];
  while (selected.length < limit) {
    let added = false;
    for (const source of sources) {
      const candidate = queues.get(source)?.shift();
      if (!candidate) continue;
      selected.push(candidate.article);
      added = true;
      if (selected.length >= limit) break;
    }
    if (!added) break;
  }
  return selected;
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
