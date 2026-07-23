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
    let referencedFiles = 0;

    index.forEach((entry, position) => {
      const location = `index.json[${position}]`;
      validateArticle(entry, location);
      if (!isObject(entry) || !isNonEmptyString(entry.slug)) return;

      const slug = entry.slug;
      if (slugs.has(slug)) reportError(`${location}.slug duplicates ${slug}`);
      slugs.add(slug);

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
