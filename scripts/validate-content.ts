/**
 * Read-only validation for the published article index and the files it references.
 * Historical orphan files are intentionally ignored so they cannot break the build.
 */

import fs from "fs";
import path from "path";
import { CONTENT_DIR } from "../src/lib/constants";

type JsonObject = Record<string, unknown>;

const ARTICLE_TYPES = new Set(["review", "vs", "howto", "bestof", "trend"]);
const ARTICLE_CATEGORIES = new Set([
  "frontend",
  "backend",
  "devops",
  "ai-ml",
  "mobile",
  "tools",
  "security",
  "database",
  "language",
]);
const SOURCES = new Set(["github", "npm", "hackernews"]);
const MAX_REPORTED_ERRORS = 50;
const BANNED_CONTENT: Array<[RegExp, string]> = [
  [/\b\d+(?:\.\d+)?MM\b/i, "contains malformed MM number formatting"],
  [/\bgit clone\s+https?:\/\/(?:www\.)?npmjs\.com\b/i, "tries to git clone an NPM page"],
  [/\b(?:ad-placeholder|advertisement placeholder|adsbygoogle|data-ad-(?:client|slot))\b/i, "contains an ad placeholder or embedded ad markup"],
  [/\b(?:we|our team|techtrends daily)\s+(?:tested|benchmarked|reviewed)\b/i, "claims unsupported first-hand testing or review"],
  [/\b(?:hands-on (?:test|review)|after (?:we )?tested|in our tests)\b/i, "claims unsupported hands-on testing"],
];

const errors: string[] = [];
let totalErrors = 0;

function reportError(message: string): void {
  totalErrors++;
  if (errors.length < MAX_REPORTED_ERRORS) errors.push(message);
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isHttpUrl(value: unknown): boolean {
  if (!isNonEmptyString(value)) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function parseHttpUrl(value: unknown): URL | null {
  if (!isNonEmptyString(value)) return null;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed : null;
  } catch {
    return null;
  }
}

function isDateOnly(value: unknown): boolean {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function isIsoDate(value: unknown): boolean {
  return isNonEmptyString(value) && !Number.isNaN(Date.parse(value));
}

function validateStringArray(value: unknown, location: string): void {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    reportError(`${location} must be an array of strings`);
  }
}

function validateNonNegativeNumber(value: unknown, location: string): void {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    reportError(`${location} must be a finite non-negative number`);
  }
}

function normalizedGitHubRepository(value: unknown): string | null {
  const parsed = parseHttpUrl(value);
  if (!parsed || parsed.protocol !== "https:" || parsed.hostname.toLowerCase() !== "github.com") {
    return null;
  }
  const parts = parsed.pathname.replace(/\.git$/i, "").split("/").filter(Boolean);
  if (parts.length !== 2 || parts.some((part) => !/^[a-z0-9_.-]+$/i.test(part))) return null;
  return `https://github.com/${parts[0].toLowerCase()}/${parts[1].toLowerCase()}`;
}

function validateContentClaims(
  bodyHtml: unknown,
  source: JsonObject,
  location: string,
): void {
  if (!isNonEmptyString(bodyHtml)) return;

  for (const [pattern, message] of BANNED_CONTENT) {
    if (pattern.test(bodyHtml)) reportError(`${location}.bodyHtml ${message}`);
  }

  if (!/automated snapshot/i.test(bodyHtml) || !/no independent product testing/i.test(bodyHtml)) {
    reportError(`${location}.bodyHtml must disclose automated snapshot generation and lack of independent testing`);
  }

  const sourceType = String(source.source);
  if (sourceType === "npm") {
    if (!/weekly NPM downloads/i.test(bodyHtml)) {
      reportError(`${location}.bodyHtml must label the NPM metric as weekly downloads`);
    }
    if (/new GitHub stars (?:this week|in the recorded weekly window)/i.test(bodyHtml)) {
      reportError(`${location}.bodyHtml mislabels NPM downloads as GitHub star growth`);
    }
  } else if (sourceType === "github") {
    if (!/new GitHub stars/i.test(bodyHtml)) {
      reportError(`${location}.bodyHtml must label GitHub growth as new GitHub stars`);
    }
    if (/weekly NPM downloads/i.test(bodyHtml)) {
      reportError(`${location}.bodyHtml mixes NPM downloads into a GitHub snapshot`);
    }
  } else if (sourceType === "hackernews") {
    if (!/Hacker News points/i.test(bodyHtml)) {
      reportError(`${location}.bodyHtml must label the Hacker News score as points`);
    }
    if (/weekly NPM downloads|new GitHub stars/i.test(bodyHtml)) {
      reportError(`${location}.bodyHtml mixes package/repository growth into a Hacker News snapshot`);
    }
  }

  const cloneCommands = bodyHtml.matchAll(/\bgit clone\s+(https?:\/\/[^\s<]+)/gi);
  for (const match of cloneCommands) {
    const cloneRepository = normalizedGitHubRepository(match[1]);
    const sourceRepository = normalizedGitHubRepository(source.url);
    if (sourceType !== "github" || !cloneRepository || cloneRepository !== sourceRepository) {
      reportError(`${location}.bodyHtml contains a git clone command that does not match its GitHub source`);
    }
  }
}

function validateArticle(value: unknown, location: string, expectedSlug?: string): void {
  if (!isObject(value)) {
    reportError(`${location} must contain a JSON object`);
    return;
  }

  const slug = value.slug;
  if (!isNonEmptyString(slug) || !/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug)) {
    reportError(`${location}.slug must be a non-empty URL-safe slug`);
  } else if (expectedSlug && slug !== expectedSlug) {
    reportError(`${location}.slug (${slug}) does not match index slug (${expectedSlug})`);
  }

  for (const field of ["title", "description", "bodyHtml"] as const) {
    if (!isNonEmptyString(value[field])) reportError(`${location}.${field} must be a non-empty string`);
  }

  if (!ARTICLE_CATEGORIES.has(String(value.category))) {
    reportError(`${location}.category is invalid`);
  }
  if (!ARTICLE_TYPES.has(String(value.type))) {
    reportError(`${location}.type is invalid`);
  }
  if (!isDateOnly(value.publishedAt)) {
    reportError(`${location}.publishedAt must be a valid YYYY-MM-DD date`);
  }
  if (!isDateOnly(value.updatedAt)) {
    reportError(`${location}.updatedAt must be a valid YYYY-MM-DD date`);
  }

  validateStringArray(value.relatedSlugs, `${location}.relatedSlugs`);
  validateStringArray(value.tags, `${location}.tags`);

  if (!isObject(value.sourceData)) {
    reportError(`${location}.sourceData must be an object`);
    return;
  }

  const source = value.sourceData;
  for (const field of ["id", "name", "fullName"] as const) {
    if (!isNonEmptyString(source[field])) reportError(`${location}.sourceData.${field} must be a non-empty string`);
  }
  if (!SOURCES.has(String(source.source))) {
    reportError(`${location}.sourceData.source is invalid`);
  }
  if (!ARTICLE_CATEGORIES.has(String(source.category))) {
    reportError(`${location}.sourceData.category is invalid`);
  }
  if (source.category !== value.category) {
    reportError(`${location}.sourceData.category must match article category`);
  }
  if (!isHttpUrl(source.url)) {
    reportError(`${location}.sourceData.url must be an HTTP(S) URL`);
  }
  if (source.homepage !== "" && source.homepage !== undefined && !isHttpUrl(source.homepage)) {
    reportError(`${location}.sourceData.homepage must be empty or an HTTP(S) URL`);
  }
  if (!isIsoDate(source.createdAt)) {
    reportError(`${location}.sourceData.createdAt must be a valid date`);
  }
  if (!isIsoDate(source.updatedAt)) {
    reportError(`${location}.sourceData.updatedAt must be a valid date`);
  }
  for (const field of ["stars", "starsGrowth", "forks", "openIssues"] as const) {
    validateNonNegativeNumber(source[field], `${location}.sourceData.${field}`);
  }
  validateStringArray(source.topics, `${location}.sourceData.topics`);

  const parsedSourceUrl = parseHttpUrl(source.url);
  if (source.source === "npm") {
    if (
      !parsedSourceUrl
      || !["npmjs.com", "www.npmjs.com"].includes(parsedSourceUrl.hostname.toLowerCase())
      || !parsedSourceUrl.pathname.startsWith("/package/")
    ) {
      reportError(`${location}.sourceData.url must be an official NPM package URL`);
    }
  } else if (source.source === "github" && !normalizedGitHubRepository(source.url)) {
    reportError(`${location}.sourceData.url must identify a GitHub owner/repository`);
  }

  validateContentClaims(value.bodyHtml, source, location);
}

function readJson(filePath: string, location: string): unknown {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    reportError(`${location} is not valid readable JSON: ${detail}`);
    return null;
  }
}

function main(): void {
  const contentDir = path.resolve(CONTENT_DIR);
  const indexPath = path.join(contentDir, "index.json");
  if (!fs.existsSync(indexPath)) {
    console.error(`Content validation failed: index not found at ${indexPath}`);
    process.exitCode = 1;
    return;
  }

  const index = readJson(indexPath, "index.json");
  if (!Array.isArray(index)) {
    reportError("index.json must contain an array");
  } else {
    const slugs = new Set<string>();
    const sourceIds = new Set<string>();
    const titles = new Set<string>();
    let referencedFiles = 0;

    index.forEach((entry, position) => {
      const location = `index.json[${position}]`;
      validateArticle(entry, location);
      if (!isObject(entry) || !isNonEmptyString(entry.slug)) return;

      const slug = entry.slug;
      if (slugs.has(slug)) reportError(`${location}.slug duplicates ${slug}`);
      slugs.add(slug);

      if (isNonEmptyString(entry.title)) {
        const normalizedTitle = entry.title.replace(/\s+/g, " ").trim().toLocaleLowerCase("en-US");
        if (titles.has(normalizedTitle)) reportError(`${location}.title duplicates ${entry.title}`);
        titles.add(normalizedTitle);
      }

      if (isObject(entry.sourceData) && isNonEmptyString(entry.sourceData.id)) {
        const sourceId = entry.sourceData.id;
        if (sourceIds.has(sourceId)) reportError(`${location}.sourceData.id duplicates ${sourceId}`);
        sourceIds.add(sourceId);
      }

      if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug)) return;
      const articlePath = path.join(contentDir, `${slug}.json`);
      if (!fs.existsSync(articlePath)) {
        reportError(`${location} references missing file ${slug}.json`);
        return;
      }

      referencedFiles++;
      const article = readJson(articlePath, `${slug}.json`);
      validateArticle(article, `${slug}.json`, slug);
    });

    console.log(`Content validation checked ${index.length} index entries and ${referencedFiles} referenced article files.`);
    console.log("Historical article files not referenced by index.json were intentionally ignored.");
  }

  if (totalErrors > 0) {
    for (const error of errors) console.error(`ERROR: ${error}`);
    if (totalErrors > errors.length) {
      console.error(`...and ${totalErrors - errors.length} more errors`);
    }
    console.error(`Content validation failed with ${totalErrors} error(s).`);
    process.exitCode = 1;
    return;
  }

  console.log("Content validation passed with no errors.");
}

main();
