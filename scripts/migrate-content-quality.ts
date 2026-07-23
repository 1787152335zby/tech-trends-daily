import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  buildArticle,
  canonicalArticleSlug,
  sourceQualityScore,
} from "./generate-articles";
import type { Article, RepoData } from "../src/lib/types";

const PROJECT_ROOT = path.resolve(".");
const ARTICLE_DIR = path.resolve(PROJECT_ROOT, "content/articles");
const INDEX_PATH = path.join(ARTICLE_DIR, "index.json");
const REDIRECT_PATH = path.resolve(PROJECT_ROOT, "content/article-redirects.json");
const DATA_PATH = path.resolve(PROJECT_ROOT, "data/all-trending.json");
const MAX_ARTICLES = 300;

interface ParsedArticleFile {
  article: Article;
  filename: string;
}

interface MigrationPlan {
  articles: Article[];
  corruptFiles: string[];
  indexJson: string;
  redirectJson: string;
  redirects: Record<string, string>;
  retainedFilenames: Set<string>;
  staleFiles: string[];
}

function isInside(parent: string, candidate: string): boolean {
  const relative = path.relative(parent, candidate);
  return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
}

function assertSafeArticlePath(candidate: string): void {
  const resolved = path.resolve(candidate);
  if (!isInside(ARTICLE_DIR, resolved)) {
    throw new Error(`Refusing to modify a path outside ${ARTICLE_DIR}: ${resolved}`);
  }
}

function readJson<T>(filename: string): T {
  return JSON.parse(fs.readFileSync(filename, "utf-8")) as T;
}

function dateOnly(value: unknown): string | null {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? value
    : null;
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function latestArticle(group: ParsedArticleFile[]): Article {
  return [...group]
    .map(({ article }) => article)
    .sort(
      (left, right) =>
        String(right.updatedAt).localeCompare(String(left.updatedAt)) ||
        String(right.publishedAt).localeCompare(String(left.publishedAt)) ||
        right.slug.localeCompare(left.slug),
    )[0];
}

function earliestPublishedAt(group: ParsedArticleFile[], fallback: string): string {
  return (
    group
      .map(({ article }) => dateOnly(article.publishedAt))
      .filter((value): value is string => Boolean(value))
      .sort()[0] ?? fallback
  );
}

function validUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function eligible(repo: RepoData): boolean {
  if (!repo.id?.trim() || !repo.name?.trim() || !repo.fullName?.trim()) return false;
  if (!repo.description?.trim() || !validUrl(repo.url)) return false;
  if (!Number.isFinite(repo.starsGrowth) || repo.starsGrowth < 0) return false;
  if (!Array.isArray(repo.topics)) return false;
  if (repo.source === "npm") {
    return /^(?:@[a-z0-9][a-z0-9._~-]*\/)?[a-z0-9][a-z0-9._~-]*$/i.test(
      repo.name,
    );
  }
  if (repo.source === "github") {
    try {
      const parsed = new URL(repo.url);
      return (
        parsed.hostname.toLowerCase() === "github.com" &&
        parsed.pathname.split("/").filter(Boolean).length >= 2
      );
    } catch {
      return false;
    }
  }
  return repo.source === "hackernews";
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function stableJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function loadExistingRedirects(): Record<string, string> {
  if (!fs.existsSync(REDIRECT_PATH)) return {};
  const parsed: unknown = readJson(REDIRECT_PATH);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
  return Object.fromEntries(
    Object.entries(parsed)
      .filter(
        (entry): entry is [string, string] =>
          typeof entry[0] === "string" && typeof entry[1] === "string",
      )
      .map(([from, to]) => [from.trim(), to.trim()])
      .filter(([from, to]) => from && to),
  );
}

function planMigration(): MigrationPlan {
  const currentIndex = readJson<Article[]>(INDEX_PATH);
  if (!Array.isArray(currentIndex) || currentIndex.length === 0) {
    throw new Error("The current article index is empty or invalid.");
  }

  const publicSourceIds = new Set(
    currentIndex.map((article) => article.sourceData?.id).filter(Boolean),
  );
  const parsedFiles: ParsedArticleFile[] = [];
  const corruptFiles: string[] = [];
  const articleFilenames = fs
    .readdirSync(ARTICLE_DIR)
    .filter((filename) => filename.endsWith(".json") && filename !== "index.json")
    .sort();

  for (const filename of articleFilenames) {
    const fullPath = path.join(ARTICLE_DIR, filename);
    try {
      const article = readJson<Article>(fullPath);
      if (article?.slug && article?.sourceData?.id) {
        parsedFiles.push({ article, filename });
      } else {
        corruptFiles.push(filename);
      }
    } catch {
      corruptFiles.push(filename);
    }
  }

  const bySourceId = new Map<string, ParsedArticleFile[]>();
  for (const parsed of parsedFiles) {
    const sourceId = parsed.article.sourceData.id;
    if (!publicSourceIds.has(sourceId)) continue;
    const group = bySourceId.get(sourceId) ?? [];
    group.push(parsed);
    bySourceId.set(sourceId, group);
  }

  const currentRepos = fs.existsSync(DATA_PATH)
    ? readJson<RepoData[]>(DATA_PATH)
    : [];
  const currentIds = new Set(currentRepos.map((repo) => repo.id));
  const rankedCandidates = Array.from(bySourceId.entries())
    .map(([sourceId, group]) => {
      const latest = latestArticle(group);
      const currentRepo = currentRepos.find((repo) => repo.id === sourceId);
      const repo = currentRepo && eligible(currentRepo) ? currentRepo : latest.sourceData;
      return {
        current: currentIds.has(sourceId),
        publishedAt: earliestPublishedAt(group, latest.publishedAt),
        repo,
        score: sourceQualityScore(repo),
      };
    })
    .filter(({ repo }) => eligible(repo))
    .sort(
      (left, right) =>
        Number(right.current) - Number(left.current) ||
        right.score - left.score ||
        right.repo.starsGrowth - left.repo.starsGrowth ||
        left.repo.id.localeCompare(right.repo.id),
    );
  const selectedCandidateIds = new Set<string>();
  const candidates: typeof rankedCandidates = [];
  const minimumPerCategory = 12;
  const availableCategories = Array.from(
    new Set(rankedCandidates.map(({ repo }) => repo.category)),
  ).sort();
  for (const category of availableCategories) {
    for (const candidate of rankedCandidates
      .filter(({ repo }) => repo.category === category)
      .slice(0, minimumPerCategory)) {
      if (selectedCandidateIds.has(candidate.repo.id)) continue;
      selectedCandidateIds.add(candidate.repo.id);
      candidates.push(candidate);
    }
  }
  for (const candidate of rankedCandidates) {
    if (candidates.length >= MAX_ARTICLES) break;
    if (selectedCandidateIds.has(candidate.repo.id)) continue;
    selectedCandidateIds.add(candidate.repo.id);
    candidates.push(candidate);
  }

  const selectedIds = new Set(candidates.map(({ repo }) => repo.id));
  const initialArticles = candidates.map(({ publishedAt, repo }) =>
    buildArticle(repo, {
      publishedAt,
      updatedAt: todayUtc(),
    }),
  );
  const selectedById = new Map(
    initialArticles.map((article) => [article.sourceData.id, article]),
  );

  const articles = initialArticles.map((article) => {
    const relatedSlugs = candidates
      .filter(
        ({ repo }) =>
          repo.category === article.category &&
          repo.id !== article.sourceData.id &&
          selectedIds.has(repo.id),
      )
      .sort(
        (left, right) =>
          right.score - left.score ||
          right.repo.starsGrowth - left.repo.starsGrowth ||
          left.repo.id.localeCompare(right.repo.id),
      )
      .slice(0, 4)
      .map(({ repo }) => selectedById.get(repo.id)?.slug)
      .filter((slug): slug is string => Boolean(slug));
    return buildArticle(article.sourceData, {
      publishedAt: article.publishedAt,
      relatedSlugs,
      updatedAt: article.updatedAt,
    });
  });

  const canonicalBySourceId = new Map(
    articles.map((article) => [article.sourceData.id, article.slug]),
  );
  const canonicalSlugs = new Set(articles.map((article) => article.slug));
  const redirects = loadExistingRedirects();

  for (const { article } of parsedFiles) {
    const target = canonicalBySourceId.get(article.sourceData.id);
    if (target && article.slug !== target) redirects[article.slug] = target;
  }
  for (const article of currentIndex) {
    const target = canonicalBySourceId.get(article.sourceData.id);
    if (target && article.slug !== target) redirects[article.slug] = target;
  }
  for (const filename of corruptFiles) {
    const oldSlug = filename.replace(/\.json$/, "");
    const match = articles.find((article) =>
      oldSlug.startsWith(`${slugify(article.sourceData.name)}-`),
    );
    if (match && oldSlug !== match.slug) redirects[oldSlug] = match.slug;
  }

  const flattened: Record<string, string> = {};
  for (const [from, rawTarget] of Object.entries(redirects).sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    let target = rawTarget;
    const seen = new Set([from]);
    while (redirects[target] && !seen.has(target)) {
      seen.add(target);
      target = redirects[target];
    }
    if (seen.has(target) || from === target || !canonicalSlugs.has(target)) continue;
    flattened[from] = target;
  }

  const retainedFilenames = new Set([
    "index.json",
    ...articles.map((article) => `${article.slug}.json`),
  ]);
  const staleFiles = articleFilenames.filter(
    (filename) => !retainedFilenames.has(filename),
  );
  const sortedArticles = [...articles].sort(
    (left, right) =>
      right.updatedAt.localeCompare(left.updatedAt) ||
      sourceQualityScore(right.sourceData) - sourceQualityScore(left.sourceData) ||
      left.title.localeCompare(right.title),
  );

  return {
    articles: sortedArticles,
    corruptFiles,
    indexJson: stableJson(sortedArticles),
    redirectJson: stableJson(flattened),
    redirects: flattened,
    retainedFilenames,
    staleFiles,
  };
}

function digest(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex").slice(0, 16);
}

function report(plan: MigrationPlan): void {
  const sources = plan.articles.reduce<Record<string, number>>((counts, article) => {
    counts[article.sourceData.source] = (counts[article.sourceData.source] ?? 0) + 1;
    return counts;
  }, {});
  const categories = plan.articles.reduce<Record<string, number>>((counts, article) => {
    counts[article.category] = (counts[article.category] ?? 0) + 1;
    return counts;
  }, {});
  console.log(
    JSON.stringify(
      {
        canonicalArticles: plan.articles.length,
        categories,
        corruptFiles: plan.corruptFiles,
        indexSha256: digest(plan.indexJson),
        redirects: Object.keys(plan.redirects).length,
        sources,
        staleFilesToPrune: plan.staleFiles.length,
      },
      null,
      2,
    ),
  );
}

function applyMigration(plan: MigrationPlan): void {
  for (const article of plan.articles) {
    const filename = path.join(ARTICLE_DIR, `${canonicalArticleSlug(article.sourceData)}.json`);
    assertSafeArticlePath(filename);
    fs.writeFileSync(filename, stableJson(article));
  }
  fs.writeFileSync(INDEX_PATH, plan.indexJson);
  fs.writeFileSync(REDIRECT_PATH, plan.redirectJson);

  for (const filename of plan.staleFiles) {
    const fullPath = path.join(ARTICLE_DIR, filename);
    assertSafeArticlePath(fullPath);
    fs.unlinkSync(fullPath);
  }
}

function checkMigration(plan: MigrationPlan): void {
  const mismatches: string[] = [];
  if (!fs.existsSync(REDIRECT_PATH) || fs.readFileSync(REDIRECT_PATH, "utf-8") !== plan.redirectJson) {
    mismatches.push("content/article-redirects.json");
  }
  if (fs.readFileSync(INDEX_PATH, "utf-8") !== plan.indexJson) {
    mismatches.push("content/articles/index.json");
  }
  for (const article of plan.articles) {
    const filename = path.join(ARTICLE_DIR, `${article.slug}.json`);
    if (!fs.existsSync(filename) || fs.readFileSync(filename, "utf-8") !== stableJson(article)) {
      mismatches.push(path.relative(PROJECT_ROOT, filename));
    }
  }
  if (plan.staleFiles.length > 0) {
    mismatches.push(`${plan.staleFiles.length} stale article files`);
  }
  if (mismatches.length > 0) {
    throw new Error(`Content migration check failed: ${mismatches.slice(0, 20).join(", ")}`);
  }
  console.log("Content migration check passed.");
}

const args = new Set(process.argv.slice(2));
const plan = planMigration();
report(plan);

if (args.has("--apply")) {
  applyMigration(plan);
  console.log("Content migration applied.");
} else if (args.has("--check")) {
  checkMigration(plan);
} else {
  console.log("Dry run only. Re-run with --apply to write files.");
}
