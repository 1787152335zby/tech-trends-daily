import { createHash } from "crypto";
import fs from "fs/promises";
import path from "path";
import type { RepoData } from "../../src/lib/types";

export interface LatestReleaseEvidence {
  tag: string;
  publishedAt?: string;
  url: string;
}

export interface MaintenanceEvidence {
  openIssues?: number;
  forks?: number;
  updatedAt?: string;
}

export interface EvidenceItem {
  label: string;
  value: string;
  url: string;
  observedAt: string;
  kind: string;
}

export interface EvidencePack {
  sourceId: string;
  source: RepoData["source"];
  fetchedAt: string;
  summary: string;
  officialUrls: string[];
  quickStart?: string;
  latestRelease?: LatestReleaseEvidence;
  maintenance?: MaintenanceEvidence;
  evidence: EvidenceItem[];
  score: number;
  warnings: string[];
}

export interface EvidenceCollectionOptions {
  cacheDir?: string;
  cacheTtlMs?: number;
  timeoutMs?: number;
  concurrency?: number;
  forceRefresh?: boolean;
  fetchImpl?: typeof fetch;
  now?: () => Date;
  githubToken?: string;
  onProgress?: (completed: number, total: number, pack: EvidencePack) => void;
}

type EvidencePackDraft = Omit<EvidencePack, "score">;

const DEFAULT_CACHE_DIR = path.join("data", "evidence-cache");
const DEFAULT_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_CONCURRENCY = 4;
const NO_TESTING_WARNING =
  "Official metadata was collected as source evidence; no independent installation, benchmark, security audit, or practical product evaluation is claimed.";

class HttpStatusError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "HttpStatusError";
  }
}

interface GitHubRepositoryResponse {
  full_name?: string;
  html_url?: string;
  description?: string | null;
  homepage?: string | null;
  stargazers_count?: number;
  forks_count?: number;
  open_issues_count?: number;
  archived?: boolean;
  disabled?: boolean;
  pushed_at?: string | null;
  updated_at?: string | null;
  default_branch?: string;
  license?: { spdx_id?: string | null } | null;
}

interface GitHubReleaseResponse {
  tag_name?: string;
  name?: string | null;
  html_url?: string;
  published_at?: string | null;
}

interface NpmRegistryResponse {
  name?: string;
  description?: string;
  readme?: string;
  keywords?: string[];
  homepage?: string;
  repository?: string | { type?: string; url?: string };
  license?: string | { type?: string };
  maintainers?: Array<{ name?: string }>;
  "dist-tags"?: { latest?: string };
  versions?: Record<
    string,
    {
      version?: string;
      dependencies?: Record<string, string>;
      engines?: Record<string, string>;
      deprecated?: string;
      dist?: { tarball?: string };
    }
  >;
  time?: Record<string, string>;
}

interface NpmDownloadsResponse {
  downloads?: number;
  start?: string;
  end?: string;
  package?: string;
}

interface HackerNewsResponse {
  id?: number;
  type?: string;
  by?: string;
  time?: number;
  title?: string;
  text?: string;
  url?: string;
  score?: number;
  descendants?: number;
  deleted?: boolean;
  dead?: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function validHttpUrl(value: unknown): string | undefined {
  const text = nonEmptyString(value);
  if (!text) return undefined;
  try {
    const parsed = new URL(text);
    return parsed.protocol === "https:" || parsed.protocol === "http:"
      ? parsed.toString()
      : undefined;
  } catch {
    return undefined;
  }
}

function uniqueStrings(values: Array<string | undefined>): string[] {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}

function cleanText(value: unknown, maxLength = 500): string {
  const text = nonEmptyString(value);
  if (!text) return "";
  return text
    .replace(/<[^>]*>/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;|&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function readmeSummary(value: unknown): string {
  const text = nonEmptyString(value);
  if (!text) return "";

  const paragraphs = text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]*>/g, " ")
    .split(/\n\s*\n/)
    .map((paragraph) =>
      paragraph
        .replace(/^\s{0,3}#{1,6}\s+/gm, "")
        .replace(/^\s*[-*+>]\s+/gm, "")
        .replace(/[`*_~|]/g, "")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter(
      (paragraph) =>
        paragraph.length >= 45
        && !/^(?:install(?:ation)?|usage|license|contributing|documentation)\b/i.test(paragraph)
        && !/\b(?:build status|coverage|npm version|downloads?)\b.*\b(?:badge|shield)\b/i.test(paragraph),
    );

  return cleanText(paragraphs[0], 500);
}

function valueText(value: unknown): string | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value === "boolean") return String(value);
  return nonEmptyString(value);
}

function addEvidence(
  items: EvidenceItem[],
  label: string,
  value: unknown,
  url: string,
  observedAt: string,
  kind: string,
): void {
  const text = valueText(value);
  if (!text) return;
  items.push({ label, value: text, url, observedAt, kind });
}

function pushWarning(warnings: string[], warning: string): void {
  if (!warnings.includes(warning)) warnings.push(warning);
}

function daysBetween(earlier: string, later: string): number | null {
  const start = Date.parse(earlier);
  const end = Date.parse(later);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  return Math.max(0, Math.floor((end - start) / 86_400_000));
}

function maintenanceWarnings(
  updatedAt: string | undefined,
  fetchedAt: string,
  archived: boolean | undefined,
): string[] {
  const warnings: string[] = [];
  if (archived) warnings.push("The official source marks this repository as archived.");
  const ageDays = updatedAt ? daysBetween(updatedAt, fetchedAt) : null;
  if (ageDays !== null && ageDays > 365) {
    warnings.push(
      `The latest recorded source update was more than one year old at collection time (${ageDays} days).`,
    );
  }
  return warnings;
}

/**
 * Deterministic evidence-completeness score. This is not a product-quality,
 * security, or suitability rating.
 */
export function scoreEvidencePack(pack: Omit<EvidencePack, "score">): number {
  let score = 0;
  if (pack.summary.trim()) score += 15;
  if (pack.officialUrls.length > 0) score += 15;
  if (pack.officialUrls.length > 1) score += 5;
  score += Math.min(30, pack.evidence.length * 6);

  if (pack.source === "hackernews") {
    if (pack.officialUrls.some((url) => url.startsWith("https://news.ycombinator.com/item"))) {
      score += 20;
    }
    if (pack.evidence.length >= 3) score += 15;
  } else {
    if (pack.quickStart) score += 10;
    if (pack.latestRelease) score += pack.source === "npm" ? 15 : 10;
    if (pack.maintenance?.updatedAt) score += 10;
  }

  return Math.min(100, score);
}

export function finalizeEvidencePack(draft: EvidencePackDraft): EvidencePack {
  const normalized: EvidencePackDraft = {
    ...draft,
    officialUrls: uniqueStrings(draft.officialUrls),
    evidence: [...draft.evidence].sort(
      (left, right) =>
        left.kind.localeCompare(right.kind) ||
        left.label.localeCompare(right.label) ||
        left.url.localeCompare(right.url),
    ),
    warnings: Array.from(new Set(draft.warnings)),
  };
  return { ...normalized, score: scoreEvidencePack(normalized) };
}

function repoDataFallbackDraft(
  repo: RepoData,
  fetchedAt: string,
  reason?: string,
): EvidencePackDraft {
  const hnId = repo.source === "hackernews" ? hackerNewsId(repo) : null;
  const sourcePage =
    repo.source === "npm" && validNpmPackageName(repo.name)
      ? npmPackagePage(repo.name)
      : repo.source === "hackernews" && hnId
        ? `https://news.ycombinator.com/item?id=${hnId}`
        : validHttpUrl(repo.url);
  const officialUrl = sourcePage ?? validHttpUrl(repo.url);
  const evidence: EvidenceItem[] = [];
  if (officialUrl) {
    addEvidence(
      evidence,
      "Source description",
      cleanText(repo.description),
      officialUrl,
      fetchedAt,
      "source-snapshot",
    );
    addEvidence(
      evidence,
      repo.source === "npm"
        ? "Recorded weekly downloads"
        : repo.source === "hackernews"
          ? "Recorded Hacker News score"
          : "Recorded GitHub stars",
      repo.source === "github" ? repo.stars : repo.starsGrowth,
      officialUrl,
      fetchedAt,
      "source-snapshot",
    );
  }

  const warnings = [
    reason
      ? `Live official evidence could not be refreshed: ${reason}`
      : "Only the previously collected source snapshot was available.",
    NO_TESTING_WARNING,
  ];

  return {
    sourceId: repo.id,
    source: repo.source,
    fetchedAt,
    summary:
      cleanText(repo.description) ||
      `${repo.name} source metadata snapshot; no source description was available.`,
    officialUrls: uniqueStrings([officialUrl]),
    maintenance:
      repo.source === "hackernews"
        ? undefined
        : {
            openIssues: finiteNumber(repo.openIssues),
            forks: finiteNumber(repo.forks),
            updatedAt: nonEmptyString(repo.updatedAt),
          },
    evidence,
    warnings,
  };
}

export function buildFallbackEvidencePack(
  repo: RepoData,
  fetchedAt: string,
  reason?: string,
): EvidencePack {
  return finalizeEvidencePack(repoDataFallbackDraft(repo, fetchedAt, reason));
}

function githubCoordinates(repo: RepoData): { owner: string; name: string } | null {
  const candidates = [repo.fullName, repo.url];
  for (const candidate of candidates) {
    const text = nonEmptyString(candidate);
    if (!text) continue;
    const match = text.match(
      /^(?:https?:\/\/github\.com\/)?([a-z0-9_.-]+)\/([a-z0-9_.-]+?)(?:\.git)?\/?$/i,
    );
    if (match) return { owner: match[1], name: match[2] };
  }
  return null;
}

function validNpmPackageName(name: string): boolean {
  return /^(?:@[a-z0-9][a-z0-9._~-]*\/)?[a-z0-9][a-z0-9._~-]*$/i.test(name);
}

function npmPackagePage(name: string): string {
  return `https://www.npmjs.com/package/${name
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}

function normalizeRepositoryUrl(value: unknown): string | undefined {
  const raw =
    typeof value === "string"
      ? value
      : isRecord(value)
        ? nonEmptyString(value.url)
        : undefined;
  if (!raw) return undefined;

  const normalized = raw
    .replace(/^git\+/, "")
    .replace(/^git:\/\/github\.com\//, "https://github.com/")
    .replace(/^git@github\.com:/, "https://github.com/")
    .replace(/\.git(?:#.*)?$/, "");
  return validHttpUrl(normalized);
}

function hackerNewsId(repo: RepoData): string | null {
  const idMatch = repo.id.match(/^hn-(\d+)$/);
  if (idMatch) return idMatch[1];
  try {
    const parsed = new URL(repo.url);
    if (parsed.hostname === "news.ycombinator.com") {
      return parsed.searchParams.get("id");
    }
  } catch {
    // The caller will return a source-snapshot fallback.
  }
  return null;
}

async function fetchJson<T>(
  url: string,
  options: {
    fetchImpl: typeof fetch;
    timeoutMs: number;
    headers?: Record<string, string>;
    acceptStatuses?: number[];
  },
): Promise<T | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs);
  try {
    const response = await options.fetchImpl(url, {
      headers: options.headers,
      signal: controller.signal,
    });
    if (options.acceptStatuses?.includes(response.status)) return null;
    if (!response.ok) {
      throw new HttpStatusError(
        response.status,
        `HTTP ${response.status} from ${new URL(url).hostname}`,
      );
    }
    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchText(
  url: string,
  options: {
    fetchImpl: typeof fetch;
    timeoutMs: number;
    headers?: Record<string, string>;
  },
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs);
  try {
    const response = await options.fetchImpl(url, {
      headers: options.headers,
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new HttpStatusError(
        response.status,
        `HTTP ${response.status} from ${new URL(url).hostname}`,
      );
    }
    return (await response.text()).slice(0, 250_000);
  } finally {
    clearTimeout(timeout);
  }
}

function htmlDescription(html: string): string {
  const metaTags = html.match(/<meta\b[^>]*>/gi) ?? [];
  for (const tag of metaTags) {
    if (!/(?:name|property)\s*=\s*["'](?:description|og:description|twitter:description)["']/i.test(tag)) {
      continue;
    }
    const content = tag.match(/\bcontent\s*=\s*["']([^"']+)["']/i)?.[1];
    const description = cleanText(content, 500);
    if (description.length >= 40) return description;
  }
  return "";
}

function safeErrorMessage(error: unknown): string {
  if (error instanceof HttpStatusError) return error.message;
  if (error instanceof Error && error.name === "AbortError") {
    return "official API request timed out";
  }
  if (error instanceof Error && /fetch failed/i.test(error.message)) {
    return "official API network request failed";
  }
  return error instanceof Error
    ? cleanText(error.message, 180) || "unknown collection error"
    : "unknown collection error";
}

async function collectGitHubEvidence(
  repo: RepoData,
  fetchedAt: string,
  fetchImpl: typeof fetch,
  timeoutMs: number,
  githubToken?: string,
): Promise<EvidencePack> {
  const coordinates = githubCoordinates(repo);
  if (!coordinates) throw new Error("GitHub owner/repository could not be derived");

  const encodedOwner = encodeURIComponent(coordinates.owner);
  const encodedRepo = encodeURIComponent(coordinates.name);
  const apiUrl = `https://api.github.com/repos/${encodedOwner}/${encodedRepo}`;
  const releasesApiUrl = `${apiUrl}/releases/latest`;
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "TechTrends-Daily-Evidence-Collector",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (githubToken) headers.Authorization = `Bearer ${githubToken}`;

  const repository = await fetchJson<GitHubRepositoryResponse>(apiUrl, {
    fetchImpl,
    timeoutMs,
    headers,
  });
  if (!repository) throw new Error("GitHub repository metadata was unavailable");

  let release: GitHubReleaseResponse | null = null;
  const warnings: string[] = [];
  try {
    release = await fetchJson<GitHubReleaseResponse>(releasesApiUrl, {
      fetchImpl,
      timeoutMs,
      headers,
      acceptStatuses: [404],
    });
  } catch (error) {
    pushWarning(
      warnings,
      `Latest GitHub release metadata was unavailable: ${safeErrorMessage(error)}`,
    );
  }

  const repositoryUrl =
    validHttpUrl(repository.html_url) ??
    `https://github.com/${coordinates.owner}/${coordinates.name}`;
  const releaseUrl = validHttpUrl(release?.html_url);
  const homepage = validHttpUrl(repository.homepage);
  const evidence: EvidenceItem[] = [];
  addEvidence(
    evidence,
    "Repository",
    repository.full_name ?? `${coordinates.owner}/${coordinates.name}`,
    apiUrl,
    fetchedAt,
    "repository",
  );
  addEvidence(
    evidence,
    "GitHub stars",
    finiteNumber(repository.stargazers_count),
    apiUrl,
    fetchedAt,
    "repository-metric",
  );
  addEvidence(
    evidence,
    "Forks",
    finiteNumber(repository.forks_count),
    apiUrl,
    fetchedAt,
    "repository-metric",
  );
  addEvidence(
    evidence,
    "Open issues",
    finiteNumber(repository.open_issues_count),
    apiUrl,
    fetchedAt,
    "repository-metric",
  );
  addEvidence(
    evidence,
    "Last source push",
    repository.pushed_at,
    apiUrl,
    fetchedAt,
    "maintenance",
  );
  addEvidence(
    evidence,
    "License",
    repository.license?.spdx_id,
    apiUrl,
    fetchedAt,
    "repository-metadata",
  );
  addEvidence(
    evidence,
    "Archived",
    repository.archived,
    apiUrl,
    fetchedAt,
    "maintenance",
  );

  if (!release) {
    warnings.push(
      "No latest release was returned by the GitHub Releases API; the project may publish by another method.",
    );
  }
  if (!repository.license?.spdx_id) {
    warnings.push("The GitHub API did not report an SPDX license identifier.");
  }
  warnings.push(
    ...maintenanceWarnings(
      repository.pushed_at ?? repository.updated_at ?? undefined,
      fetchedAt,
      repository.archived,
    ),
    NO_TESTING_WARNING,
  );

  const cloneTarget = repositoryUrl.replace(/\/$/, "");
  return finalizeEvidencePack({
    sourceId: repo.id,
    source: repo.source,
    fetchedAt,
    summary:
      cleanText(repository.description) ||
      `${repository.full_name ?? repo.fullName} GitHub repository; no repository description was supplied.`,
    officialUrls: uniqueStrings([repositoryUrl, releaseUrl, homepage]),
    quickStart: `git clone ${cloneTarget}.git`,
    latestRelease:
      release && releaseUrl && nonEmptyString(release.tag_name ?? release.name)
        ? {
            tag: nonEmptyString(release.tag_name ?? release.name) as string,
            publishedAt: nonEmptyString(release.published_at),
            url: releaseUrl,
          }
        : undefined,
    maintenance: {
      openIssues: finiteNumber(repository.open_issues_count),
      forks: finiteNumber(repository.forks_count),
      updatedAt: nonEmptyString(repository.pushed_at ?? repository.updated_at),
    },
    evidence,
    warnings,
  });
}

async function collectNpmEvidence(
  repo: RepoData,
  fetchedAt: string,
  fetchImpl: typeof fetch,
  timeoutMs: number,
): Promise<EvidencePack> {
  if (!validNpmPackageName(repo.name)) {
    throw new Error("npm package name is invalid");
  }

  const registryUrl = `https://registry.npmjs.org/${encodeURIComponent(repo.name)}`;
  const downloadsUrl = `https://api.npmjs.org/downloads/point/last-week/${encodeURIComponent(repo.name)}`;
  const packagePage = npmPackagePage(repo.name);
  const registry = await fetchJson<NpmRegistryResponse>(registryUrl, {
    fetchImpl,
    timeoutMs,
    headers: {
      Accept: "application/json",
      "User-Agent": "TechTrends-Daily-Evidence-Collector",
    },
  });
  if (!registry) throw new Error("npm registry metadata was unavailable");

  let downloads: NpmDownloadsResponse | null = null;
  const warnings: string[] = [];
  try {
    downloads = await fetchJson<NpmDownloadsResponse>(downloadsUrl, {
      fetchImpl,
      timeoutMs,
      headers: {
        Accept: "application/json",
        "User-Agent": "TechTrends-Daily-Evidence-Collector",
      },
    });
  } catch (error) {
    warnings.push(
      `Weekly npm download evidence was unavailable: ${safeErrorMessage(error)}`,
    );
  }

  const latestTag = nonEmptyString(registry["dist-tags"]?.latest);
  const latestVersion = latestTag ? registry.versions?.[latestTag] : undefined;
  const repositoryUrl = normalizeRepositoryUrl(registry.repository);
  const homepage = validHttpUrl(registry.homepage);
  const latestPublishedAt = latestTag
    ? nonEmptyString(registry.time?.[latestTag])
    : undefined;
  const modifiedAt = nonEmptyString(registry.time?.modified ?? latestPublishedAt);
  let homepageSummary = "";
  if (!cleanText(registry.description) && !readmeSummary(registry.readme) && homepage) {
    try {
      homepageSummary = htmlDescription(
        await fetchText(homepage, {
          fetchImpl,
          timeoutMs,
          headers: {
            Accept: "text/html",
            "User-Agent": "TechTrends-Daily-Evidence-Collector",
          },
        }),
      );
    } catch {
      // Homepage metadata is an optional enrichment. Registry evidence remains
      // sufficient when the site is unavailable or blocks automated requests.
    }
  }
  const documentationSummary =
    cleanText(registry.description)
    || readmeSummary(registry.readme)
    || homepageSummary;
  const evidence: EvidenceItem[] = [];
  addEvidence(
    evidence,
    "Package",
    registry.name ?? repo.name,
    registryUrl,
    fetchedAt,
    "registry",
  );
  addEvidence(
    evidence,
    "Official package summary",
    documentationSummary,
    registryUrl,
    fetchedAt,
    "documentation",
  );
  addEvidence(
    evidence,
    "Package keywords",
    registry.keywords?.slice(0, 12).join(", "),
    registryUrl,
    fetchedAt,
    "documentation",
  );
  addEvidence(
    evidence,
    "Weekly downloads",
    finiteNumber(downloads?.downloads),
    downloadsUrl,
    fetchedAt,
    "registry-metric",
  );
  addEvidence(
    evidence,
    "Download window",
    downloads?.start && downloads?.end
      ? `${downloads.start} to ${downloads.end}`
      : undefined,
    downloadsUrl,
    fetchedAt,
    "registry-metric",
  );
  addEvidence(
    evidence,
    "Latest version",
    latestTag,
    registryUrl,
    fetchedAt,
    "release",
  );
  addEvidence(
    evidence,
    "Latest version published",
    latestPublishedAt,
    registryUrl,
    fetchedAt,
    "release",
  );
  addEvidence(
    evidence,
    "Direct dependencies",
    latestVersion?.dependencies
      ? Object.keys(latestVersion.dependencies).length
      : undefined,
    registryUrl,
    fetchedAt,
    "package-metadata",
  );
  addEvidence(
    evidence,
    "License",
    typeof registry.license === "string"
      ? registry.license
      : registry.license?.type,
    registryUrl,
    fetchedAt,
    "package-metadata",
  );
  addEvidence(
    evidence,
    "Maintainers listed",
    registry.maintainers?.length,
    registryUrl,
    fetchedAt,
    "maintenance",
  );
  addEvidence(
    evidence,
    "Registry modified",
    modifiedAt,
    registryUrl,
    fetchedAt,
    "maintenance",
  );
  addEvidence(
    evidence,
    "Node.js engine",
    latestVersion?.engines?.node,
    registryUrl,
    fetchedAt,
    "compatibility",
  );

  warnings.push(...maintenanceWarnings(modifiedAt, fetchedAt, false));
  if (!latestTag) warnings.push("The npm registry did not provide a latest dist-tag.");
  if (latestVersion?.deprecated) {
    warnings.push(`The latest npm version is marked deprecated: ${cleanText(latestVersion.deprecated, 180)}`);
  }
  if (!registry.license) {
    warnings.push("The npm registry did not report a package license.");
  }
  warnings.push(NO_TESTING_WARNING);

  return finalizeEvidencePack({
    sourceId: repo.id,
    source: repo.source,
    fetchedAt,
    summary:
      documentationSummary ||
      `${registry.name ?? repo.name} npm package; no registry description was supplied.`,
    officialUrls: uniqueStrings([
      packagePage,
      registryUrl,
      downloads ? downloadsUrl : undefined,
      repositoryUrl,
      homepage,
    ]),
    quickStart: `npm install ${repo.name}`,
    latestRelease: latestTag
      ? {
          tag: latestTag,
          publishedAt: latestPublishedAt,
          url: packagePage,
        }
      : undefined,
    maintenance: { updatedAt: modifiedAt },
    evidence,
    warnings,
  });
}

async function collectHackerNewsEvidence(
  repo: RepoData,
  fetchedAt: string,
  fetchImpl: typeof fetch,
  timeoutMs: number,
): Promise<EvidencePack> {
  const itemId = hackerNewsId(repo);
  if (!itemId || !/^\d+$/.test(itemId)) {
    throw new Error("Hacker News item ID could not be derived");
  }

  const apiUrl = `https://hacker-news.firebaseio.com/v0/item/${itemId}.json`;
  const discussionUrl = `https://news.ycombinator.com/item?id=${itemId}`;
  const item = await fetchJson<HackerNewsResponse>(apiUrl, {
    fetchImpl,
    timeoutMs,
    headers: {
      Accept: "application/json",
      "User-Agent": "TechTrends-Daily-Evidence-Collector",
    },
  });
  if (!item) throw new Error("Hacker News item metadata was unavailable");

  const evidence: EvidenceItem[] = [];
  addEvidence(
    evidence,
    "Hacker News item",
    item.id,
    apiUrl,
    fetchedAt,
    "discussion",
  );
  addEvidence(
    evidence,
    "Author",
    item.by,
    apiUrl,
    fetchedAt,
    "discussion",
  );
  addEvidence(
    evidence,
    "Points at collection",
    finiteNumber(item.score),
    apiUrl,
    fetchedAt,
    "attention-metric",
  );
  addEvidence(
    evidence,
    "Comments at collection",
    finiteNumber(item.descendants),
    apiUrl,
    fetchedAt,
    "attention-metric",
  );
  addEvidence(
    evidence,
    "Published",
    item.time ? new Date(item.time * 1000).toISOString() : undefined,
    apiUrl,
    fetchedAt,
    "discussion",
  );

  const warnings = [
    "Hacker News points and comments are time-specific attention signals, not independent verification of the linked claims.",
    NO_TESTING_WARNING,
  ];
  if (item.dead || item.deleted) {
    warnings.unshift("The Hacker News API marks this item as dead or deleted.");
  }

  return finalizeEvidencePack({
    sourceId: repo.id,
    source: repo.source,
    fetchedAt,
    summary:
      cleanText(item.title ?? item.text) ||
      `${repo.name} Hacker News discussion; no title or text was available.`,
    officialUrls: uniqueStrings([
      discussionUrl,
      apiUrl,
      validHttpUrl(item.url),
    ]),
    evidence,
    warnings,
  });
}

function cachePath(cacheDir: string, repo: RepoData): string {
  const digest = createHash("sha256")
    .update(`${repo.source}:${repo.id}`)
    .digest("hex")
    .slice(0, 24);
  return path.join(cacheDir, `v3-${repo.source}-${digest}.json`);
}

function isEvidencePack(value: unknown): value is EvidencePack {
  if (!isRecord(value)) return false;
  return (
    typeof value.sourceId === "string" &&
    ["github", "npm", "hackernews"].includes(String(value.source)) &&
    typeof value.fetchedAt === "string" &&
    typeof value.summary === "string" &&
    Array.isArray(value.officialUrls) &&
    Array.isArray(value.evidence) &&
    typeof value.score === "number" &&
    Array.isArray(value.warnings)
  );
}

async function readCachedPack(
  filename: string,
  repo: RepoData,
): Promise<EvidencePack | null> {
  try {
    const parsed: unknown = JSON.parse(await fs.readFile(filename, "utf-8"));
    if (
      !isEvidencePack(parsed) ||
      parsed.sourceId !== repo.id ||
      parsed.source !== repo.source
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function cacheIsFresh(
  pack: EvidencePack,
  now: Date,
  cacheTtlMs: number,
): boolean {
  const fetchedAt = Date.parse(pack.fetchedAt);
  return (
    Number.isFinite(fetchedAt) &&
    now.getTime() >= fetchedAt &&
    now.getTime() - fetchedAt <= cacheTtlMs
  );
}

async function writeCachedPack(
  filename: string,
  pack: EvidencePack,
): Promise<void> {
  const temporary = `${filename}.${process.pid}.tmp`;
  await fs.writeFile(temporary, `${JSON.stringify(pack, null, 2)}\n`, "utf-8");
  await fs.rename(temporary, filename);
}

async function collectFreshEvidence(
  repo: RepoData,
  fetchedAt: string,
  options: Required<
    Pick<EvidenceCollectionOptions, "timeoutMs" | "fetchImpl">
  > & { githubToken?: string },
): Promise<EvidencePack> {
  if (repo.source === "github") {
    return collectGitHubEvidence(
      repo,
      fetchedAt,
      options.fetchImpl,
      options.timeoutMs,
      options.githubToken,
    );
  }
  if (repo.source === "npm") {
    return collectNpmEvidence(
      repo,
      fetchedAt,
      options.fetchImpl,
      options.timeoutMs,
    );
  }
  return collectHackerNewsEvidence(
    repo,
    fetchedAt,
    options.fetchImpl,
    options.timeoutMs,
  );
}

export async function collectEvidencePack(
  repo: RepoData,
  options: EvidenceCollectionOptions = {},
): Promise<EvidencePack> {
  const now = options.now?.() ?? new Date();
  const fetchedAt = now.toISOString();
  const cacheDir = path.resolve(options.cacheDir ?? DEFAULT_CACHE_DIR);
  const filename = cachePath(cacheDir, repo);
  const cacheTtlMs = Math.max(0, options.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS);
  const timeoutMs = Math.max(1, options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  await fs.mkdir(cacheDir, { recursive: true });
  const cached = await readCachedPack(filename, repo);
  if (
    cached &&
    !options.forceRefresh &&
    cacheIsFresh(cached, now, cacheTtlMs)
  ) {
    return cached;
  }

  try {
    const fresh = await collectFreshEvidence(repo, fetchedAt, {
      timeoutMs,
      fetchImpl: options.fetchImpl ?? fetch,
      githubToken:
        options.githubToken ?? process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN,
    });
    await writeCachedPack(filename, fresh);
    return fresh;
  } catch (error) {
    const reason = safeErrorMessage(error);
    if (cached) {
      return finalizeEvidencePack({
        ...cached,
        warnings: [
          ...cached.warnings,
          `Using stale cached official evidence because refresh failed: ${reason}`,
        ],
      });
    }
    return buildFallbackEvidencePack(repo, fetchedAt, reason);
  }
}

/**
 * Order-preserving concurrency limiter, exported for reuse and deterministic
 * testing.
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) return [];
  const width = Math.max(1, Math.floor(concurrency));
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function runWorker(): Promise<void> {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= items.length) return;
      results[index] = await worker(items[index], index);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(width, items.length) }, () => runWorker()),
  );
  return results;
}

export async function collectEvidencePacks(
  repos: readonly RepoData[],
  options: EvidenceCollectionOptions = {},
): Promise<EvidencePack[]> {
  const concurrency = Math.max(
    1,
    Math.floor(options.concurrency ?? DEFAULT_CONCURRENCY),
  );
  let completed = 0;

  return mapWithConcurrency(repos, concurrency, async (repo) => {
    const pack = await collectEvidencePack(repo, options);
    completed += 1;
    options.onProgress?.(completed, repos.length, pack);
    return pack;
  });
}
